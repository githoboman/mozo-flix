/**
 * One-shot script to deploy mozoflix-rewards-v2 to Stacks testnet.
 * Signs with BACKEND_PRIVATE_KEY from .env.local.
 *
 *   node scripts/deploy-rewards-v2.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeContractDeploy,
  broadcastTransaction,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

// ---- load .env.local manually (no dotenv dep) ----
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const envText = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const SENDER_KEY = env.BACKEND_PRIVATE_KEY;
if (!SENDER_KEY) {
  console.error("Missing BACKEND_PRIVATE_KEY in .env.local");
  process.exit(1);
}

const CONTRACT_NAME = "mozoflix-rewards-v2";
const SOURCE_PATH = resolve(
  __dirname,
  "..",
  "..",
  "contracts",
  "contracts",
  "mozoflix-rewards-v2.clar",
);
const codeBody = readFileSync(SOURCE_PATH, "utf8");

console.log(`Deploying ${CONTRACT_NAME} (${codeBody.length} bytes)...`);

const tx = await makeContractDeploy({
  contractName: CONTRACT_NAME,
  codeBody,
  senderKey: SENDER_KEY,
  network: STACKS_TESTNET,
  fee: 200_000n, // ~0.2 STX — generous so it lands in the next block
  clarityVersion: 3,
});

console.log("Signed tx. Broadcasting…");
const result = await broadcastTransaction({
  transaction: tx,
  network: STACKS_TESTNET,
});

if ("error" in result && result.error) {
  console.error("Broadcast rejected:", result.error, result.reason ?? "");
  process.exit(1);
}

console.log("\n✅ Broadcast accepted by node");
console.log("   txid:", result.txid);
console.log(
  `   explorer: https://explorer.hiro.so/txid/${result.txid}?chain=testnet`,
);
console.log(
  "\nWait ~10 min for confirmation, then your v2 contract will be live at:",
);
console.log(
  `   ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E.${CONTRACT_NAME}`,
);
