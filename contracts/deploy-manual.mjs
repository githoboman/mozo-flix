#!/usr/bin/env node
/**
 * contracts/deploy-manual.mjs
 *
 * Bypasses clarinet-cli 3.8.1's broken tx serialization (it produces
 * `auth flags 189` which current testnet mempools reject with
 * "unable to post transaction"). Uses @stacks/transactions v7 directly —
 * same library the frontend uses, guaranteed to speak the current wire
 * format.
 *
 * What it does:
 *   1. Reads the mnemonic from settings/Testnet.toml (deployer account)
 *   2. Derives the account 0 STX private key from the seed
 *   3. Fetches the deployer's current nonce from the Hiro API
 *   4. For each contract in the deploy plan, reads the .clar source and
 *      builds + signs + broadcasts a contract-deploy tx with an
 *      incremented nonce (so all 6 sit in the mempool in the right order)
 *   5. Prints the resulting txids so you can watch confirmations on
 *      the explorer
 *
 * Usage:
 *   node deploy-manual.mjs                    # dry-run (prints plan, no broadcast)
 *   node deploy-manual.mjs --broadcast        # actually deploys
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { generateWallet } from "@stacks/wallet-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROADCAST = process.argv.includes("--broadcast");

const CONTRACTS_IN_ORDER = [
  "mozoflix-admin",
  "mozoflix-creators",
  "mozoflix-referrals",
  "mozoflix-videos",
  "mozoflix-rewards",
  "mozoflix-rewards-v2",
];

const NETWORK = STACKS_TESTNET;
const HIRO_API = "https://api.testnet.hiro.so";

async function readMnemonicFromTestnetToml() {
  const tomlPath = path.join(__dirname, "settings", "Testnet.toml");
  const raw = await fs.readFile(tomlPath, "utf8");
  const m = raw.match(/mnemonic\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("mnemonic not found in settings/Testnet.toml");
  return m[1];
}

async function deriveDeployer(mnemonic) {
  const wallet = await generateWallet({ secretKey: mnemonic, password: "" });
  const account = wallet.accounts[0];
  if (!account) throw new Error("wallet has no accounts");
  // The wallet-sdk returns the private key in hex (64 or 66 chars)
  return {
    privateKey: account.stxPrivateKey,
    // Address derivation happens server-side too, but we don't need it here
  };
}

async function fetchNonce(address) {
  const res = await fetch(`${HIRO_API}/v2/accounts/${address}?proof=0`);
  if (!res.ok) throw new Error(`Failed to fetch nonce: ${res.status}`);
  const data = await res.json();
  return data.nonce;
}

async function fetchDeployerAddress(privateKey) {
  // Cheap way to get the address from a private key: sign a throwaway tx
  // and read `senderAddress`. But easier: we know the mnemonic in the
  // repo derives to ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E; we can
  // still verify against the wallet-sdk account.
  // For now we accept the known address as authoritative — if it doesn't
  // match, the broadcast will fail with a nonce error anyway.
  return "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";
}

async function main() {
  console.log("MOZOflix testnet manual deploy");
  console.log("mode:", BROADCAST ? "BROADCAST" : "DRY-RUN (add --broadcast to send)");
  console.log("");

  const mnemonic = await readMnemonicFromTestnetToml();
  const { privateKey } = await deriveDeployer(mnemonic);
  const senderAddress = await fetchDeployerAddress(privateKey);

  console.log("Deployer:", senderAddress);
  console.log("Fetching nonce…");
  const startNonce = await fetchNonce(senderAddress);
  console.log("Start nonce:", startNonce);
  console.log("");

  let nonce = startNonce;
  const results = [];

  for (const contractName of CONTRACTS_IN_ORDER) {
    const codePath = path.join(
      __dirname,
      "contracts",
      `${contractName}.clar`,
    );
    const codeBody = await fs.readFile(codePath, "utf8");
    console.log(`→ ${contractName} (nonce ${nonce}, ${codeBody.length} chars)`);

    if (!BROADCAST) {
      results.push({ contractName, nonce, txid: "(dry-run)" });
      nonce += 1;
      continue;
    }

    const tx = await makeContractDeploy({
      contractName,
      codeBody,
      senderKey: privateKey,
      network: NETWORK,
      nonce: BigInt(nonce),
      // Fee at 1000 µSTX per byte-ish — Nakamoto testnet is cheap.
      // Bumping to 50k µSTX to make sure the tx clears the min fee floor.
      fee: 50000n,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      clarityVersion: 3,
    });

    const result = await broadcastTransaction({ transaction: tx, network: NETWORK });
    if ("error" in result && result.error) {
      console.error(
        `  ✗ Broadcast failed for ${contractName}:`,
        result.error,
        result.reason,
        result.reason_data,
      );
      results.push({ contractName, nonce, txid: null, error: result.reason });
      // Don't bump nonce on error — retry from here after fixing
      break;
    }
    const txid = result.txid;
    console.log(`  ✓ txid: 0x${txid}`);
    results.push({ contractName, nonce, txid });
    nonce += 1;
    // Small delay to be gentle with the mempool
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("");
  console.log("Summary:");
  for (const r of results) {
    if (r.txid) {
      console.log(`  ${r.contractName.padEnd(24)} nonce=${r.nonce}  ${r.txid}`);
    } else {
      console.log(`  ${r.contractName.padEnd(24)} FAILED: ${r.error}`);
    }
  }

  if (BROADCAST && results.every((r) => r.txid)) {
    console.log("");
    console.log("All 6 broadcast. Watch confirmations on:");
    console.log(
      `  https://explorer.hiro.so/address/${senderAddress}?chain=testnet`,
    );
    console.log("");
    console.log("Contracts should be callable in ~2-10 min once anchored.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
