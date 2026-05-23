import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const viewer = accounts.get("wallet_2")!;
const viewer2 = accounts.get("wallet_3")!;
const sponsor = accounts.get("wallet_4")!;
const backend = accounts.get("wallet_5")!;
const stranger = accounts.get("wallet_6")!;

const ADMIN = "mozoflix-admin";
const VIDEOS = "mozoflix-videos";
const REWARDS = "mozoflix-rewards";

const HASH = Cl.bufferFromHex("b".repeat(64));
const REWARD_PER_VIEW = 1_000_000n; // 1 STX in micro-STX
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

function fundPool(videoId: number, amount: bigint, sender = creator) {
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

describe("mozoflix-rewards: fund-pool", () => {
  it("creator funds the pool; 5% fee skimmed; net deposited", () => {
    registerVideo();
    const before = simnet.getAssetsMap().get("STX")?.get(creator) ?? 0n;
    const { result } = fundPool(1, FUND_AMOUNT, creator);
    expect(result).toBeOk(
      Cl.tuple({
        funded: Cl.uint(95_000_000),
        fee: Cl.uint(5_000_000),
        "video-id": Cl.uint(1),
      }),
    );
    const after = simnet.getAssetsMap().get("STX")?.get(creator) ?? 0n;
    expect(before - after).toBe(FUND_AMOUNT);

    const pool = simnet.callReadOnlyFn(
      REWARDS,
      "get-pool",
      [Cl.uint(1)],
      deployer,
    );
    expect(pool.result).toBeTuple({
      balance: Cl.uint(95_000_000),
      "total-funded": Cl.uint(95_000_000),
      "total-distributed": Cl.uint(0),
      "claim-count": Cl.uint(0),
    });
  });

  it("a third-party sponsor can fund", () => {
    registerVideo();
    const tx = fundPool(1, FUND_AMOUNT, sponsor);
    expect(tx.result).toBeOk(
      Cl.tuple({
        funded: Cl.uint(95_000_000),
        fee: Cl.uint(5_000_000),
        "video-id": Cl.uint(1),
      }),
    );
  });

  it("rejects funding for non-existent video", () => {
    const tx = fundPool(99, FUND_AMOUNT, creator);
    expect(tx.result).toBeErr(Cl.uint(3003));
  });

  it("rejects zero amount", () => {
    registerVideo();
    const tx = fundPool(1, 0n, creator);
    expect(tx.result).toBeErr(Cl.uint(3008));
  });

  it("blocks funding when paused", () => {
    registerVideo();
    simnet.callPublicFn(ADMIN, "set-paused", [Cl.bool(true)], deployer);
    const tx = fundPool(1, FUND_AMOUNT, creator);
    expect(tx.result).toBeErr(Cl.uint(3000));
  });

  it("multiple funds accumulate", () => {
    registerVideo();
    fundPool(1, FUND_AMOUNT, creator);
    fundPool(1, FUND_AMOUNT, sponsor);
    const { result } = simnet.callReadOnlyFn(
      REWARDS,
      "get-pool-balance",
      [Cl.uint(1)],
      deployer,
    );
    expect(result).toBeUint(190_000_000);
  });
});

describe("mozoflix-rewards: distribute-reward", () => {
  beforeEach(() => {
    registerVideo();
    fundPool(1, FUND_AMOUNT, creator);
    authorize(backend);
  });

  it("authorized backend distributes to viewer at 70% completion", () => {
    const before = simnet.getAssetsMap().get("STX")?.get(viewer) ?? 0n;
    const { result } = distribute(1, viewer, 70);
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
    const { result } = distribute(1, viewer, 90, stranger);
    expect(result).toBeErr(Cl.uint(3001));
  });

  it("rejects double-claim by same viewer for same video", () => {
    distribute(1, viewer, 80);
    // need to wait past cooldown — but double-claim error fires before rate-limit
    simnet.mineEmptyBlocks(10);
    const { result } = distribute(1, viewer, 95);
    expect(result).toBeErr(Cl.uint(3005));
  });

  it("rejects when pool insufficient", () => {
    // drain via withdraw, then try
    simnet.callPublicFn(REWARDS, "withdraw-pool", [Cl.uint(1)], creator);
    const { result } = distribute(1, viewer, 90);
    expect(result).toBeErr(Cl.uint(3007));
  });

  it("rejects when video inactive", () => {
    simnet.callPublicFn(VIDEOS, "set-video-active", [Cl.uint(1), Cl.bool(false)], creator);
    const { result } = distribute(1, viewer, 90);
    expect(result).toBeErr(Cl.uint(3004));
  });

  it("blocks distribution when paused", () => {
    simnet.callPublicFn(ADMIN, "set-paused", [Cl.bool(true)], deployer);
    const { result } = distribute(1, viewer, 90);
    expect(result).toBeErr(Cl.uint(3000));
  });

  it("rejects completion > 100", () => {
    const { result } = distribute(1, viewer, 101);
    expect(result).toBeErr(Cl.uint(3009));
  });

  it("enforces per-viewer cooldown across videos", () => {
    distribute(1, viewer, 80);
    // register and fund a second video
    registerVideo();
    fundPool(2, FUND_AMOUNT, creator);
    // immediate second claim by same viewer should be rate-limited
    const { result } = distribute(2, viewer, 80);
    expect(result).toBeErr(Cl.uint(3010));
  });

  it("allows claim on second video after cooldown elapses", () => {
    distribute(1, viewer, 80);
    registerVideo();
    fundPool(2, FUND_AMOUNT, creator);
    simnet.mineEmptyBlocks(6);
    const { result } = distribute(2, viewer, 80);
    expect(result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(2), reward: Cl.uint(REWARD_PER_VIEW) }),
    );
  });

  it("records claim and event metadata", () => {
    const heightAtClaim = simnet.blockHeight;
    distribute(1, viewer, 88);
    const claim = simnet.callReadOnlyFn(
      REWARDS,
      "get-claim",
      [Cl.uint(1), Cl.principal(viewer)],
      deployer,
    );
    expect(claim.result).toBeSome(
      Cl.tuple({
        amount: Cl.uint(REWARD_PER_VIEW),
        completion: Cl.uint(88),
        block: Cl.uint(heightAtClaim + 1),
      }),
    );
    const totalEvents = simnet.callReadOnlyFn(REWARDS, "get-total-events", [], deployer);
    expect(totalEvents.result).toBeUint(1);
  });

  it("decrements pool balance and increments distribution counters", () => {
    distribute(1, viewer, 80);
    const pool = simnet.callReadOnlyFn(REWARDS, "get-pool", [Cl.uint(1)], deployer);
    expect(pool.result).toBeTuple({
      balance: Cl.uint(95_000_000n - REWARD_PER_VIEW),
      "total-funded": Cl.uint(95_000_000),
      "total-distributed": Cl.uint(REWARD_PER_VIEW),
      "claim-count": Cl.uint(1),
    });
  });

  it("two distinct viewers can claim from same video (with cooldown spacing)", () => {
    const a = distribute(1, viewer, 80);
    expect(a.result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(1), reward: Cl.uint(REWARD_PER_VIEW) }),
    );
    const b = distribute(1, viewer2, 80);
    expect(b.result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(2), reward: Cl.uint(REWARD_PER_VIEW) }),
    );
  });
});

describe("mozoflix-rewards: withdraw-pool", () => {
  beforeEach(() => {
    registerVideo();
    fundPool(1, FUND_AMOUNT, creator);
  });

  it("creator withdraws full remaining balance", () => {
    const before = simnet.getAssetsMap().get("STX")?.get(creator) ?? 0n;
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-pool",
      [Cl.uint(1)],
      creator,
    );
    expect(result).toBeOk(Cl.uint(95_000_000));
    const after = simnet.getAssetsMap().get("STX")?.get(creator) ?? 0n;
    expect(after - before).toBe(95_000_000n);
    const balance = simnet.callReadOnlyFn(
      REWARDS,
      "get-pool-balance",
      [Cl.uint(1)],
      deployer,
    );
    expect(balance.result).toBeUint(0);
  });

  it("non-creator cannot withdraw", () => {
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-pool",
      [Cl.uint(1)],
      stranger,
    );
    expect(result).toBeErr(Cl.uint(3002));
  });

  it("cannot withdraw with empty pool", () => {
    simnet.callPublicFn(REWARDS, "withdraw-pool", [Cl.uint(1)], creator);
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-pool",
      [Cl.uint(1)],
      creator,
    );
    expect(result).toBeErr(Cl.uint(3012));
  });

  it("cannot withdraw on missing video", () => {
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-pool",
      [Cl.uint(99)],
      creator,
    );
    expect(result).toBeErr(Cl.uint(3003));
  });

  it("withdraw after partial distribution returns remainder", () => {
    authorize(backend);
    distribute(1, viewer, 80);
    const remaining = 95_000_000n - REWARD_PER_VIEW;
    const { result } = simnet.callPublicFn(
      REWARDS,
      "withdraw-pool",
      [Cl.uint(1)],
      creator,
    );
    expect(result).toBeOk(Cl.uint(remaining));
  });
});

describe("mozoflix-rewards: end-to-end", () => {
  it("full lifecycle: register → fund → distribute → withdraw", () => {
    // 1. creator registers a video
    const reg = registerVideo(creator);
    expect(reg.result).toBeOk(Cl.uint(1));

    // 2. creator funds pool
    fundPool(1, FUND_AMOUNT, creator);

    // 3. owner authorizes platform backend
    authorize(backend);

    // 4. backend distributes to 3 different viewers (with cooldown spacing)
    expect(distribute(1, viewer, 75).result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(1), reward: Cl.uint(REWARD_PER_VIEW) }),
    );
    expect(distribute(1, viewer2, 90).result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(2), reward: Cl.uint(REWARD_PER_VIEW) }),
    );
    const v3 = accounts.get("wallet_7")!;
    expect(distribute(1, v3, 100).result).toBeOk(
      Cl.tuple({ "event-id": Cl.uint(3), reward: Cl.uint(REWARD_PER_VIEW) }),
    );

    // 5. creator pulls remaining
    const expected = 95_000_000n - REWARD_PER_VIEW * 3n;
    const wd = simnet.callPublicFn(REWARDS, "withdraw-pool", [Cl.uint(1)], creator);
    expect(wd.result).toBeOk(Cl.uint(expected));

    // 6. final state
    const pool = simnet.callReadOnlyFn(REWARDS, "get-pool", [Cl.uint(1)], deployer);
    expect(pool.result).toBeTuple({
      balance: Cl.uint(0),
      "total-funded": Cl.uint(95_000_000),
      "total-distributed": Cl.uint(REWARD_PER_VIEW * 3n),
      "claim-count": Cl.uint(3),
    });
    const totalEvents = simnet.callReadOnlyFn(REWARDS, "get-total-events", [], deployer);
    expect(totalEvents.result).toBeUint(3);
  });
});
