# MOZOflix EVM Contracts — Deployment Guide

`MozoflixRewards.sol` is the EVM port of `mozoflix-rewards-v2.clar`. One instance per chain (Base, Celo, later Starknet-EVM wrappers, etc.).

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A funded deployer wallet on the target chain (Base Sepolia faucet: <https://www.alchemy.com/faucets/base-sepolia>; Alfajores faucet: <https://faucet.celo.org>)
- BaseScan / CeloScan API keys for verification (free)

## One-time repo setup

```bash
cd evm-contracts
forge init --no-git --no-commit .
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0
forge install foundry-rs/forge-std
forge build
```

## Base Sepolia (testnet)

```bash
export DEPLOYER_PK=0x…            # deployer private key
export BASESCAN_KEY=…             # basescan.org API key (etherscan-compatible)
export REWARD_TOKEN=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Circle USDC on Base Sepolia
export OWNER=0x…                  # the server signer address (BACKEND_PRIVATE_KEY's derived address)
export FEE_BPS=500                # 5% protocol fee

forge script script/Deploy.s.sol:Deploy \
  --rpc-url base_sepolia \
  --private-key $DEPLOYER_PK \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_KEY
```

The script prints the deployed address. Add it to the frontend env:

```
NEXT_PUBLIC_BASE_REWARDS_CONTRACT=0x…
```

Then verify a `getVideo(1)` call reverts with `VideoNotFound()` on BaseScan to confirm the contract is live.

## Celo Alfajores (testnet)

```bash
export DEPLOYER_PK=0x…
export CELOSCAN_KEY=…
export REWARD_TOKEN=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1  # cUSD on Alfajores
export OWNER=0x…
export FEE_BPS=500

forge script script/Deploy.s.sol:Deploy \
  --rpc-url celo_alfajores \
  --private-key $DEPLOYER_PK \
  --broadcast --verify \
  --etherscan-api-key $CELOSCAN_KEY
```

Add to frontend env:

```
NEXT_PUBLIC_CELO_REWARDS_CONTRACT=0x…
```

## Mainnet cutover

**Do not deploy to Base or Celo mainnet without an audit.** The Solidity contract inherits from OpenZeppelin (audited), uses `nonReentrant` on every state-mutating public entry point, and the surface is small — but the reward-token custody model still deserves a fresh set of eyes.

Once audited, flip `enabled: true` on the mainnet entries in `frontend/lib/chains.ts` and repeat the deploy with mainnet RPC endpoints and the production USDC / cUSD addresses (already in `chains.ts`).

## What's next after deploy

1. Fund the `OWNER` address with a small amount of the reward token — the contract holds pools but not gas.
2. Register a test video from a creator wallet with a modest funding amount (say 1 USDC).
3. From the server, call `distributeReward(videoId, viewerAddress, 100)` — confirm on BaseScan that the viewer received the reward minus the 5% fee.
4. If everything works, flip the frontend `WalletModal` to expose the Base wallets. Real viewers can now earn USDC.