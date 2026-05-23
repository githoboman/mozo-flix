/**
 * lib/stacks.ts
 * Helpers for Stacks wallet auth + MOZOflix contract calls.
 * Compatible with @stacks/connect v8 (new connect/disconnect/getLocalStorage API).
 */

import {
  connect as connectStacks,
  disconnect as disconnectStacks,
  isConnected as isConnectedFn,
  getLocalStorage,
  openContractCall,
} from "@stacks/connect";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";
import {
  uintCV,
  principalCV,
  stringAsciiCV,
  stringUtf8CV,
  bufferCVFromString,
  boolCV,
  Pc,
  PostConditionMode,
  type ClarityValue,
  type PostCondition,
} from "@stacks/transactions";

// ---------- Network ----------

const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
export const network = isMainnet ? STACKS_MAINNET : STACKS_TESTNET;

export const APP_DETAILS = {
  name: "MOZOflix",
  icon: "/logo.png",
};

// ---------- Auth helpers (v8 API) ----------

export async function connectWallet(onSuccess?: () => void) {
  try {
    await connectStacks({ enableLocalStorage: true });
    onSuccess?.();
  } catch (e) {
    console.log("Wallet connect cancelled or failed", e);
  }
}

export function disconnectWallet() {
  disconnectStacks();
}

export function isConnected(): boolean {
  if (typeof window === "undefined") return false;
  return isConnectedFn();
}

/**
 * Returns the connected STX address from local storage.
 * Picks mainnet/testnet based on NEXT_PUBLIC_STACKS_NETWORK.
 */
export function getAddress(): string | null {
  if (typeof window === "undefined") return null;
  const data = getLocalStorage();
  if (!data?.addresses?.stx?.length) return null;
  // v8 stores all available addresses; pick the one matching current network.
  // Testnet addresses start with "ST", mainnet with "SP".
  const prefix = isMainnet ? "SP" : "ST";
  const match = data.addresses.stx.find((a) =>
    a.address?.startsWith(prefix),
  );
  return match?.address ?? data.addresses.stx[0]?.address ?? null;
}

// ---------- Contract addresses ----------

const CONTRACT_OWNER =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";

const CONTRACTS = {
  videos: `${CONTRACT_OWNER}.mozoflix-videos`,
  // v2: escrow fees + register-and-fund. Self-funding works.
  rewards: `${CONTRACT_OWNER}.mozoflix-rewards-v2`,
  creators: `${CONTRACT_OWNER}.mozoflix-creators`,
  referrals: `${CONTRACT_OWNER}.mozoflix-referrals`,
  admin: `${CONTRACT_OWNER}.mozoflix-admin`,
};

function splitContract(full: string): [string, string] {
  const [addr, name] = full.split(".");
  return [addr, name];
}

// ---------- Generic contract call wrapper ----------

async function callContract(
  contractFull: string,
  functionName: string,
  functionArgs: ClarityValue[],
  postConditions: PostCondition[] = [],
  onSuccess?: (txId: string) => void,
) {
  const [contractAddress, contractName] = splitContract(contractFull);
  await openContractCall({
    network,
    appDetails: APP_DETAILS,
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    postConditions,
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => onSuccess?.(data.txId),
    onCancel: () => console.log("Transaction cancelled"),
  });
}

// ---------- mozoflix-videos ----------

export async function registerVideo(
  contentHashHex: string,
  rewardPerView: bigint,
  minCompletion: number,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.videos,
    "register-video",
    [
      bufferCVFromString(contentHashHex),
      uintCV(rewardPerView),
      uintCV(minCompletion),
    ],
    [],
    onSuccess,
  );
}

export async function setVideoActive(
  videoId: number,
  active: boolean,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.videos,
    "set-video-active",
    [uintCV(videoId), boolCV(active)],
    [],
    onSuccess,
  );
}

// ---------- mozoflix-rewards ----------

/**
 * One-signature creator onboarding: registers the video AND funds the pool
 * in a single atomic transaction. The total amount the wallet sends is
 * (fund-amount) — fees are escrowed inside the contract.
 */
export async function registerAndFund(
  contentHashHex: string,
  rewardPerView: bigint,
  minCompletion: number,
  fundAmount: bigint,
  senderAddress: string,
  onSuccess?: (txId: string) => void,
) {
  const postCondition = Pc.principal(senderAddress)
    .willSendLte(fundAmount)
    .ustx();

  await callContract(
    CONTRACTS.rewards,
    "register-and-fund",
    [
      bufferCVFromString(contentHashHex),
      uintCV(rewardPerView),
      uintCV(minCompletion),
      uintCV(fundAmount),
    ],
    [postCondition],
    onSuccess,
  );
}

/**
 * Direct STX transfer (tip / super-chat). Uses Stacks Connect's
 * openSTXTransfer under the hood. No contract involved.
 */
export async function sendStxTip(
  recipient: string,
  amountMicroStx: bigint,
  memo?: string,
  onSuccess?: (txId: string) => void,
) {
  const { openSTXTransfer } = await import("@stacks/connect");
  await openSTXTransfer({
    network,
    appDetails: APP_DETAILS,
    recipient,
    amount: amountMicroStx.toString(),
    memo: memo?.slice(0, 32) ?? "",
    onFinish: (data) => onSuccess?.(data.txId),
    onCancel: () => console.log("Tip cancelled"),
  });
}

/** Owner-only: sweep accumulated platform fees from the contract treasury. */
export async function withdrawFees(
  to: string,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.rewards,
    "withdraw-fees",
    [principalCV(to)],
    [],
    onSuccess,
  );
}

export async function fundPool(
  videoId: number,
  amountMicroStx: bigint,
  senderAddress: string,
  onSuccess?: (txId: string) => void,
) {
  // Use willSendLte so the wallet doesn't reject if the contract's internal
  // fee+net split is interpreted as anything less than exactly `amount`.
  // The contract enforces the real accounting on its side.
  const postCondition = Pc.principal(senderAddress)
    .willSendLte(amountMicroStx)
    .ustx();

  await callContract(
    CONTRACTS.rewards,
    "fund-pool",
    [uintCV(videoId), uintCV(amountMicroStx)],
    [postCondition],
    onSuccess,
  );
}

export async function withdrawPool(
  videoId: number,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.rewards,
    "withdraw-pool",
    [uintCV(videoId)],
    [],
    onSuccess,
  );
}

// ---------- mozoflix-referrals ----------

export async function registerReferral(
  referrerAddress: string,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.referrals,
    "register-referral",
    [principalCV(referrerAddress)],
    [],
    onSuccess,
  );
}

export async function claimReferralBonus(onSuccess?: (txId: string) => void) {
  await callContract(CONTRACTS.referrals, "claim-bonus", [], [], onSuccess);
}

// ---------- mozoflix-admin (owner-only) ----------

export async function setFeeBps(
  bps: number,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.admin,
    "set-fee-bps",
    [uintCV(bps)],
    [],
    onSuccess,
  );
}

export async function setFeeRecipient(
  recipient: string,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.admin,
    "set-fee-recipient",
    [principalCV(recipient)],
    [],
    onSuccess,
  );
}

export async function setPaused(
  paused: boolean,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.admin,
    "set-paused",
    [boolCV(paused)],
    [],
    onSuccess,
  );
}

// ---------- mozoflix-creators ----------

export async function registerCreatorProfile(
  displayName: string,
  bio: string,
  avatarHashHex: string,
  onSuccess?: (txId: string) => void,
) {
  await callContract(
    CONTRACTS.creators,
    "register-profile",
    [
      stringAsciiCV(displayName),
      stringUtf8CV(bio),
      bufferCVFromString(avatarHashHex),
    ],
    [],
    onSuccess,
  );
}

// ---------- STX micro-unit helpers ----------

export const STX_DECIMALS = 1_000_000n;

export function stxToMicro(stx: number): bigint {
  return BigInt(Math.round(stx * 1_000_000));
}

export function microToStx(micro: bigint): string {
  return (Number(micro) / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
}
