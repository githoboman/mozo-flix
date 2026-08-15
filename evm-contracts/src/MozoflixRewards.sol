// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MozoflixRewards
 * @notice EVM port of mozoflix-rewards-v2.clar. One instance per chain
 *         (Base, Celo, etc). Uses an ERC20 reward token (e.g. USDC on
 *         Base, cUSD on Celo). Same public surface as the Clarity
 *         contract so the front-end can dispatch by chain without
 *         branching per API.
 *
 * Model:
 *  - Videos are registered by their creator with a per-view reward rate,
 *    min completion percentage, and an IPFS-manifest content hash.
 *  - Anyone can fund a video's pool (creators typically do). The pool
 *    escrows tokens inside the contract.
 *  - The platform owner (a server signer key) calls distributeReward on
 *    behalf of a viewer that watched past the threshold. Rewards are
 *    single-claim per (video, viewer).
 *  - A protocol fee (bps) is skimmed on distribution and swept by the
 *    owner via withdrawFees.
 *  - Creators can withdrawPool at any time (returns unspent balance).
 *  - Creators can setVideoActive(false) to hide a video and stop
 *    distributions.
 */
contract MozoflixRewards is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ---------- Types ----------

    struct Video {
        address creator;
        bytes contentHash;      // IPFS manifest hash, e.g. bytes("ipfs://Qm…")
        uint256 rewardPerView;  // in token base units (e.g. USDC = 6 decimals)
        uint16 minCompletionPct; // 1..100
        bool active;
        uint64 createdAt;       // block.timestamp
    }

    struct Pool {
        uint256 balance;
        uint256 totalFunded;
        uint256 totalDistributed;
        uint32 claimCount;
    }

    // ---------- Storage ----------

    IERC20 public immutable rewardToken;

    /** Protocol fee in basis points (100 = 1%). Owner-configurable. */
    uint16 public feeBps;
    /** Accumulated fees, sweepable via withdrawFees. */
    uint256 public feesCollected;

    uint256 public nextVideoId = 1;
    uint256 public totalVideos;

    mapping(uint256 => Video) private _videos;
    mapping(uint256 => Pool) private _pools;
    /** Per-video, per-viewer single-claim guard. */
    mapping(uint256 => mapping(address => bool)) private _claimed;

    // ---------- Events ----------

    event VideoRegistered(
        uint256 indexed videoId,
        address indexed creator,
        uint256 rewardPerView,
        uint16 minCompletionPct,
        uint256 initialFunding
    );
    event PoolFunded(
        uint256 indexed videoId,
        address indexed funder,
        uint256 amount
    );
    event RewardDistributed(
        uint256 indexed videoId,
        address indexed viewer,
        uint256 reward,
        uint256 fee
    );
    event PoolWithdrawn(
        uint256 indexed videoId,
        address indexed creator,
        uint256 amount
    );
    event VideoActiveChanged(uint256 indexed videoId, bool active);
    event FeeBpsChanged(uint16 oldBps, uint16 newBps);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ---------- Errors ----------

    error VideoNotFound();
    error NotCreator();
    error VideoInactive();
    error AlreadyClaimed();
    error InsufficientPool();
    error InvalidReward();
    error InvalidThreshold();
    error InvalidFee();
    error NoBalance();

    // ---------- Constructor ----------

    constructor(IERC20 _rewardToken, address initialOwner, uint16 initialFeeBps)
        Ownable(initialOwner)
    {
        require(address(_rewardToken) != address(0), "reward token 0x0");
        if (initialFeeBps > 1000) revert InvalidFee(); // hard cap 10%
        rewardToken = _rewardToken;
        feeBps = initialFeeBps;
    }

    // ---------- Read helpers ----------

    function getVideo(uint256 videoId) external view returns (Video memory) {
        Video memory v = _videos[videoId];
        if (v.createdAt == 0) revert VideoNotFound();
        return v;
    }

    function getPool(uint256 videoId) external view returns (Pool memory) {
        return _pools[videoId];
    }

    function hasClaimed(uint256 videoId, address viewer) external view returns (bool) {
        return _claimed[videoId][viewer];
    }

    // ---------- Register + fund ----------

    /**
     * @notice Register a new video and (optionally) fund its pool in a
     *         single tx. Mirrors register-and-fund in Clarity v2.
     * @param contentHash IPFS manifest identifier for this video.
     * @param rewardPerView Amount of the reward token paid per verified view.
     * @param minCompletionPct 1..100 completion gate before rewards fire.
     * @param initialFunding Optional amount to seed the pool immediately.
     */
    function registerAndFund(
        bytes calldata contentHash,
        uint256 rewardPerView,
        uint16 minCompletionPct,
        uint256 initialFunding
    ) external nonReentrant whenNotPaused returns (uint256 videoId) {
        if (rewardPerView == 0) revert InvalidReward();
        if (minCompletionPct == 0 || minCompletionPct > 100) revert InvalidThreshold();

        videoId = nextVideoId++;
        totalVideos += 1;
        _videos[videoId] = Video({
            creator: msg.sender,
            contentHash: contentHash,
            rewardPerView: rewardPerView,
            minCompletionPct: minCompletionPct,
            active: true,
            createdAt: uint64(block.timestamp)
        });

        if (initialFunding > 0) {
            _fundPool(videoId, msg.sender, initialFunding);
        }

        emit VideoRegistered(
            videoId,
            msg.sender,
            rewardPerView,
            minCompletionPct,
            initialFunding
        );
    }

    /**
     * @notice Top up an existing pool. Anyone can fund (creators typically do).
     */
    function fundPool(uint256 videoId, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        if (_videos[videoId].createdAt == 0) revert VideoNotFound();
        if (amount == 0) revert InvalidReward();
        _fundPool(videoId, msg.sender, amount);
    }

    function _fundPool(uint256 videoId, address funder, uint256 amount) internal {
        rewardToken.safeTransferFrom(funder, address(this), amount);
        Pool storage p = _pools[videoId];
        p.balance += amount;
        p.totalFunded += amount;
        emit PoolFunded(videoId, funder, amount);
    }

    // ---------- Distribute ----------

    /**
     * @notice Server-signed viewer reward distribution.
     * @dev Only owner (the platform signer) may call. Enforces the
     *      video's completion threshold and single-claim guard, plus a
     *      protocol fee skim. This matches the Clarity distribute-reward
     *      entry point behavior.
     */
    function distributeReward(
        uint256 videoId,
        address viewer,
        uint16 completionPct
    ) external nonReentrant whenNotPaused onlyOwner {
        Video memory v = _videos[videoId];
        if (v.createdAt == 0) revert VideoNotFound();
        if (!v.active) revert VideoInactive();
        if (completionPct < v.minCompletionPct) revert InvalidThreshold();
        if (_claimed[videoId][viewer]) revert AlreadyClaimed();

        Pool storage p = _pools[videoId];
        if (p.balance < v.rewardPerView) revert InsufficientPool();

        uint256 fee = (v.rewardPerView * feeBps) / 10_000;
        uint256 payout = v.rewardPerView - fee;

        _claimed[videoId][viewer] = true;
        p.balance -= v.rewardPerView;
        p.totalDistributed += v.rewardPerView;
        p.claimCount += 1;
        feesCollected += fee;

        rewardToken.safeTransfer(viewer, payout);
        emit RewardDistributed(videoId, viewer, payout, fee);
    }

    // ---------- Withdraw / control ----------

    /**
     * @notice Creator pulls unspent pool balance back to their wallet.
     */
    function withdrawPool(uint256 videoId) external nonReentrant {
        Video memory v = _videos[videoId];
        if (v.createdAt == 0) revert VideoNotFound();
        if (v.creator != msg.sender) revert NotCreator();
        Pool storage p = _pools[videoId];
        uint256 amount = p.balance;
        if (amount == 0) revert NoBalance();
        p.balance = 0;
        rewardToken.safeTransfer(v.creator, amount);
        emit PoolWithdrawn(videoId, v.creator, amount);
    }

    /**
     * @notice Creator toggles the active flag. Deactivated videos stop
     *         earning rewards (distribute reverts with VideoInactive).
     *         Balance can be withdrawn separately via withdrawPool.
     */
    function setVideoActive(uint256 videoId, bool active) external {
        Video storage v = _videos[videoId];
        if (v.createdAt == 0) revert VideoNotFound();
        if (v.creator != msg.sender) revert NotCreator();
        v.active = active;
        emit VideoActiveChanged(videoId, active);
    }

    /**
     * @notice Owner sweeps accumulated protocol fees to a recipient.
     */
    function withdrawFees(address to) external onlyOwner nonReentrant {
        uint256 amount = feesCollected;
        if (amount == 0) revert NoBalance();
        feesCollected = 0;
        rewardToken.safeTransfer(to, amount);
        emit FeesWithdrawn(to, amount);
    }

    function setFeeBps(uint16 newBps) external onlyOwner {
        if (newBps > 1000) revert InvalidFee();
        uint16 old = feeBps;
        feeBps = newBps;
        emit FeeBpsChanged(old, newBps);
    }

    /** Owner circuit breaker — pauses register/fund/distribute. */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}