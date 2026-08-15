// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MozoflixRewards} from "../src/MozoflixRewards.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Deploy
 * @notice One script, all chains. Reads the reward-token address, owner,
 *         and fee-bps from env vars so we don't hard-code Base-only values.
 *
 * Usage (Base Sepolia):
 *   REWARD_TOKEN=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
 *   OWNER=0xYourServerSigner \
 *   FEE_BPS=500 \
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url https://sepolia.base.org \
 *     --broadcast --verify \
 *     --etherscan-api-key $BASESCAN_KEY
 *
 * Celo Alfajores:
 *   REWARD_TOKEN=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1 \
 *   OWNER=0xYourServerSigner \
 *   FEE_BPS=500 \
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url https://alfajores-forno.celo-testnet.org \
 *     --broadcast --verify \
 *     --etherscan-api-key $CELOSCAN_KEY
 */
contract Deploy is Script {
    function run() external returns (MozoflixRewards deployed) {
        address rewardToken = vm.envAddress("REWARD_TOKEN");
        address owner = vm.envAddress("OWNER");
        uint16 feeBps = uint16(vm.envUint("FEE_BPS"));

        require(rewardToken != address(0), "REWARD_TOKEN=0x0");
        require(owner != address(0), "OWNER=0x0");
        require(feeBps <= 1000, "FEE_BPS > 10%");

        vm.startBroadcast();
        deployed = new MozoflixRewards(IERC20(rewardToken), owner, feeBps);
        vm.stopBroadcast();

        console2.log("MozoflixRewards deployed at:", address(deployed));
        console2.log("Reward token:", rewardToken);
        console2.log("Owner:", owner);
        console2.log("Fee bps:", uint256(feeBps));
        console2.log("");
        console2.log(
            "Set NEXT_PUBLIC_BASE_REWARDS_CONTRACT=%s in your frontend .env",
            address(deployed)
        );
    }
}