/**
 * lib/stacks-server.ts
 * Server-only Stacks signer for backend-initiated contract calls
 * (e.g. distribute-reward). Uses BACKEND_PRIVATE_KEY from env.
 *
 * Generate one with:
 *   npx @stacks/cli make_keychain -t
 * and copy the `keyInfo.privateKey` field into BACKEND_PRIVATE_KEY.
 *
 * For testnet you can reuse your deployer key. For mainnet, USE A SEPARATE KEY.
 */

import {
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
  PostConditionMode,
  type ClarityValue,
} from "@stacks/transactions";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";

const isMainnet = process.env.STACKS_NETWORK === "mainnet";
const network = isMainnet ? STACKS_MAINNET : STACKS_TESTNET;

const CONTRACT_OWNER =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";

function getBackendKey(): string {
  const raw = process.env.BACKEND_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "BACKEND_PRIVATE_KEY not set. Add it to your environment (Vercel → Settings → Environment Variables, marked Sensitive).",
    );
  }
  // Strip whitespace / quotes / 0x prefix users sometimes paste in by accident.
  // @stacks/transactions expects a bare hex string: 64 chars (uncompressed) or
  // 66 chars (with a trailing `01` compression byte).
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(cleaned)) {
    throw new Error(
      "BACKEND_PRIVATE_KEY isn't a hex string. Run `npx @stacks/cli make_keychain -t` and paste the `keyInfo.privateKey` value (no 0x prefix, no quotes).",
    );
  }
  if (cleaned.length !== 64 && cleaned.length !== 66) {
    throw new Error(
      `BACKEND_PRIVATE_KEY has length ${cleaned.length} hex chars; expected 64 or 66. Make sure you pasted the raw private key (keyInfo.privateKey), not a mnemonic or address.`,
    );
  }
  return cleaned;
}

async function callContract(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
): Promise<{ txid: string }> {
  const tx = await makeContractCall({
    contractAddress: CONTRACT_OWNER,
    contractName,
    functionName,
    functionArgs,
    senderKey: getBackendKey(),
    network,
    postConditionMode: PostConditionMode.Allow,
    fee: 5000n,
  });

  const result = await broadcastTransaction({ transaction: tx, network });

  // broadcastTransaction returns either `{ txid }` or `{ error, reason, ... }`.
  // Anything with an `error` property is a failure — even if it also has a txid.
  if ("error" in result && result.error) {
    const reason =
      "reason" in result
        ? (result as { reason?: string }).reason
        : undefined;
    throw new Error(
      `Broadcast rejected by node: ${result.error}${reason ? ` (${reason})` : ""}`,
    );
  }
  if (!("txid" in result) || !result.txid) {
    throw new Error("Broadcast did not return a txid");
  }
  return { txid: result.txid };
}

// ---------- Precheck helpers ----------

async function callReadOnly(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
) {
  const res = await fetchCallReadOnlyFunction({
    network,
    client: {
      baseUrl: isMainnet
        ? "https://api.hiro.so"
        : "https://api.testnet.hiro.so",
    },
    contractAddress: CONTRACT_OWNER,
    contractName,
    functionName,
    functionArgs,
    senderAddress: CONTRACT_OWNER,
  });
  return cvToJSON(res);
}

async function getPoolBalance(videoId: number): Promise<bigint> {
  const json = await callReadOnly("mozoflix-rewards-v2", "get-pool", [
    uintCV(videoId),
  ]);
  return BigInt(json?.value?.balance?.value ?? 0);
}

async function getVideoRewardRate(videoId: number): Promise<bigint> {
  const json = await callReadOnly("mozoflix-videos", "get-reward-rate", [
    uintCV(videoId),
  ]);
  // Returns (response uint err) — value sits in `.value.value` when ok
  const v = json?.value?.value ?? json?.value;
  return BigInt(v ?? 0);
}

async function hasViewerClaimed(
  videoId: number,
  viewer: string,
): Promise<boolean> {
  const json = await callReadOnly("mozoflix-rewards-v2", "has-claimed", [
    uintCV(videoId),
    principalCV(viewer),
  ]);
  return Boolean(json?.value);
}

// ---------- Public ----------

export async function distributeReward(
  viewer: string,
  videoId: number,
  completion: number,
): Promise<{ txid: string }> {
  // Precheck the chain state so we fail loudly with a useful message
  // instead of broadcasting a tx that the contract will reject.
  const [balance, reward, alreadyClaimed] = await Promise.all([
    getPoolBalance(videoId),
    getVideoRewardRate(videoId),
    hasViewerClaimed(videoId, viewer),
  ]);

  if (alreadyClaimed) {
    throw new Error(
      `Viewer already claimed for video #${videoId}. Each wallet can earn from a given video once.`,
    );
  }
  if (reward === 0n) {
    throw new Error(`Video #${videoId} not found or has no reward rate set.`);
  }
  if (balance < reward) {
    // One quick re-read in case a fund tx just confirmed in the last block.
    const fresh = await getPoolBalance(videoId);
    if (fresh < reward) {
      throw new Error(
        `Pool too small. Balance ${fresh} µSTX < reward ${reward} µSTX. Fund the pool from /studio first.`,
      );
    }
  }

  return callContract("mozoflix-rewards-v2", "distribute-reward", [
    principalCV(viewer),
    uintCV(videoId),
    uintCV(completion),
  ]);
}
