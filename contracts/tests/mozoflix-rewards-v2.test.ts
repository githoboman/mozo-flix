import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const viewer = accounts.get("wallet_2")!;
const viewer2 = accounts.get("wallet_3")!;
const sponsor = accounts.get("wallet_4")!;
const backend = accounts.get("wallet_5")!;

const ADMIN = "mozoflix-admin";
const VIDEOS = "mozoflix-videos";
const REWARDS = "mozoflix-rewards-v2";

const HASH = Cl.bufferFromHex("c".repeat(64));
const REWARD_PER_VIEW = 1_000_000n; // 1 STX
const FUND_AMOUNT = 100_000_000n; // 100 STX
const THRESHOLD = 70;

function registerVideo(sender = creator) {
  return simnet.callPublicFn(
    VIDEOS,
    "register-video",
    [HASH, Cl.uint(REWARD_PER_VIEW), Cl.uint(THRESHOLD)],
    sender,
  );
}

function fund(videoId: number, amount: bigint, sender = creator) {
  return simnet.callPublicFn(
    REWARDS,
    "fund-pool",
    [Cl.uint(videoId), Cl.uint(amount)],
    sender,
  );
}

function authorize(who: string) {
  return simnet.callPublicFn(
    ADMIN,
    "set-authorized",
    [Cl.principal(who), Cl.bool(true)],
    deployer,
  );
}

function distribute(videoId: number, to: string, completion: number, sender = backend) {
  return simnet.callPublicFn(
    REWARDS,
    "distribute-reward",
    [Cl.principal(to), Cl.uint(videoId), Cl.uint(completion)],
    sender,
  );
}

// ============================================================
// Self-funding (the bug fixed by v2)
// ============================================================

describe("v2: deployer can fund their own video (bug fixed)", () => {
  it("deployer funds their own video pool without err u2", () => {
    // Deployer is also the default fee-recipient
    registerVideo(deployer);
    const { result } = fund(1, FUND_AMOUNT, deployer);
    expect(result).toBeOk(
      Cl.tuple({
        funded: Cl.uint(95_000_000),
        fee: Cl.uint(5_000_000),
        "video-id": Cl.uint(1),
      }),
    );
  });

  it("non-owner creator can also fund", () => {
    registerVideo(creator);
    const { result } = fund(1, FUND_AMOUNT, creator);
    expect(result).toBeOk(
      Cl.tuple({
        funded: Cl.uint(95_000_000),
        fee: Cl.uint(5_000_000),
        "video-id": Cl.uint(1),
      }),
    );
  });

  it("third-party sponsor can fund someone else's video", () => {
    registerVideo(creator);
    const { result } = fund(1, FUND_AMOUNT, sponsor);
    expect(result).toBeOk(
      Cl.tuple({
        funded: Cl.uint(95_000_000),
        fee: Cl.uint(5_000_000),
        "video-id": Cl.uint(1),
      }),
    );
  });
});

// ============================================================
// Escrow fee accounting
// ============================================================

describe("v2: fees are escrowed in the contract", () => {
  it("get-fees-collected starts at 0", () => {
    const { result } = simnet.callReadOnlyFn(
      REWARDS,
      "get-fees-collected",
      [],
      deployer,
    );
    expect(result).toBeUint(0);
  });

  it("fund-pool accumulates fees", () => {
    registerVideo(creator);
    fund(1, FUND_AMOUNT, creator);
    fund(1, FUND_AMOUNT, sponsor);
    const { result } = simnet.callReadOnlyFn(
      REWARDS,
      "get-fees-collected",
      [],
      deployer,
    );
    expect(result).toBeUint(10_000_000); // 2 × 5_000_000
  });

  it("owner can sweep fees", () => {
    registerVideo(creator);
    fund(1, FUND_AMOUNT, creator);
    const before = simnet.getAssetsMap().get("STX")?.get(deployer) ?? 0n;
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-fees",
      [Cl.principal(deployer)],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(5_000_000));
    const after = simnet.getAssetsMap().get("STX")?.get(deployer) ?? 0n;
    expect(after - before).toBe(5_000_000n);
    // Counter resets
    const { result: feesAfter } = simnet.callReadOnlyFn(
      REWARDS,
      "get-fees-collected",
      [],
      deployer,
    );
    expect(feesAfter).toBeUint(0);
  });

  it("non-owner cannot withdraw fees", () => {
    registerVideo(creator);
    fund(1, FUND_AMOUNT, creator);
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-fees",
      [Cl.principal(creator)],
      creator,
    );
    expect(result).toBeErr(Cl.uint(3013));
  });

  it("no fees to withdraw fails cleanly", () => {
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-fees",
      [Cl.principal(deployer)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(3012));
  });
});

// ============================================================
// Atomic register-and-fund
// ============================================================

describe("v2: register-and-fund (single signature)", () => {
  it("registers video and funds pool atomically", () => {
    const { result } = simnet.callPublicFn(
      REWARDS,
      "register-and-fund",
      [HASH, Cl.uint(REWARD_PER_VIEW), Cl.uint(THRESHOLD), Cl.uint(FUND_AMOUNT)],
      creator,
    );
    expect(result).toBeOk(
      Cl.tuple({
        "video-id": Cl.uint(1),
        funded: Cl.uint(FUND_AMOUNT),
      }),
    );
    // Pool should reflect the funding minus fee
    const { result: pool } = simnet.callReadOnlyFn(
      REWARDS,
      "get-pool",
      [Cl.uint(1)],
      deployer,
    );
    expect(pool).toBeTuple({
      balance: Cl.uint(95_000_000),
      "total-funded": Cl.uint(95_000_000),
      "total-distributed": Cl.uint(0),
      "claim-count": Cl.uint(0),
    });
  });

  it("rolls back fully if fund step fails (insufficient balance)", () => {
    const huge = 999_999_999_999_999n;
    const { result } = simnet.callPublicFn(
      REWARDS,
      "register-and-fund",
      [HASH, Cl.uint(REWARD_PER_VIEW), Cl.uint(THRESHOLD), Cl.uint(huge)],
      viewer, // viewer doesn't have this much STX
    );
    // Should err — exact code depends on Clarity's transfer error path
    expect(result).toBeErr(Cl.uint(1));
    // No video should have been registered
    const { result: total } = simnet.callReadOnlyFn(
      VIDEOS,
      "get-total-videos",
      [],
      deployer,
    );
    expect(total).toBeUint(0);
  });

  it("propagates register-video errors", () => {
    const { result } = simnet.callPublicFn(
      REWARDS,
      "register-and-fund",
      [
        Cl.bufferFromHex(""), // invalid empty content hash
        Cl.uint(REWARD_PER_VIEW),
        Cl.uint(THRESHOLD),
        Cl.uint(FUND_AMOUNT),
      ],
      creator,
    );
    expect(result).toBeErr(Cl.uint(2004)); // ERR_INVALID_HASH from videos
  });
});

// ============================================================
// Distribute-reward still works after escrow refactor
// ============================================================

describe("v2: distribute-reward still works", () => {
  beforeEach(() => {
    registerVideo(creator);
    fund(1, FUND_AMOUNT, creator);
    authorize(backend);
  });

  it("authorized backend pays viewer on completion >= threshold", () => {
    const before = simnet.getAssetsMap().get("STX")?.get(viewer) ?? 0n;
    const { result } = distribute(1, viewer, 80);
    expect(result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(1), reward: Cl.uint(REWARD_PER_VIEW) }),
    );
    const after = simnet.getAssetsMap().get("STX")?.get(viewer) ?? 0n;
    expect(after - before).toBe(REWARD_PER_VIEW);
  });

  it("rejects below threshold", () => {
    const { result } = distribute(1, viewer, 69);
    expect(result).toBeErr(Cl.uint(3006));
  });

  it("rejects unauthorized caller", () => {
    const { result } = distribute(1, viewer, 90, sponsor);
    expect(result).toBeErr(Cl.uint(3001));
  });

  it("rejects double claim", () => {
    distribute(1, viewer, 80);
    simnet.mineEmptyBlocks(10);
    const { result } = distribute(1, viewer, 95);
    expect(result).toBeErr(Cl.uint(3005));
  });

  it("rejects when pool insufficient", () => {
    simnet.callPublicFn(REWARDS, "withdraw-pool", [Cl.uint(1)], creator);
    const { result } = distribute(1, viewer, 90);
    expect(result).toBeErr(Cl.uint(3007));
  });
});

// ============================================================
// End-to-end: register-and-fund → watch → distribute → withdraw fees
// ============================================================

describe("v2: full happy path", () => {
  it("upload(register+fund) → distribute → withdraw fees → withdraw pool", () => {
    authorize(backend);

    // 1. Creator uploads in one signature
    const reg = simnet.callPublicFn(
      REWARDS,
      "register-and-fund",
      [HASH, Cl.uint(REWARD_PER_VIEW), Cl.uint(THRESHOLD), Cl.uint(FUND_AMOUNT)],
      creator,
    );
    expect(reg.result).toBeOk(
      Cl.tuple({ "video-id": Cl.uint(1), funded: Cl.uint(FUND_AMOUNT) }),
    );

    // 2. Two viewers earn (with cooldown between)
    const v1 = distribute(1, viewer, 80);
    expect(v1.result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(1), reward: Cl.uint(REWARD_PER_VIEW) }),
    );
    const v2 = distribute(1, viewer2, 95);
    expect(v2.result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(2), reward: Cl.uint(REWARD_PER_VIEW) }),
    );

    // 3. Owner sweeps fees (5 STX from the 100 STX deposit)
    const sweep = simnet.callPublicFn(
      REWARDS,
      "withdraw-fees",
      [Cl.principal(deployer)],
      deployer,
    );
    expect(sweep.result).toBeOk(Cl.uint(5_000_000));

    // 4. Creator withdraws remaining pool
    const remaining = 95_000_000n - REWARD_PER_VIEW * 2n;
    const wd = simnet.callPublicFn(
      REWARDS,
      "withdraw-pool",
      [Cl.uint(1)],
      creator,
    );
    expect(wd.result).toBeOk(Cl.uint(remaining));
  });
});
