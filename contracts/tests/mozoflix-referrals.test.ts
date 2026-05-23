import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const referrer = accounts.get("wallet_1")!;
const referee = accounts.get("wallet_2")!;
const backend = accounts.get("wallet_3")!;
const other = accounts.get("wallet_4")!;
const sponsor = accounts.get("wallet_5")!;

const ADMIN = "mozoflix-admin";
const REFERRALS = "mozoflix-referrals";

const REWARD_BASE = 10_000_000n; // 10 STX
const EXPECTED_BONUS = 1_000_000n; // 10%
const TREASURY_FUND = 100_000_000n; // 100 STX

function authorize(who: string) {
  return simnet.callPublicFn(
    ADMIN,
    "set-authorized",
    [Cl.principal(who), Cl.bool(true)],
    deployer,
  );
}

function deposit(amount: bigint, sender = sponsor) {
  return simnet.callPublicFn(
    REFERRALS,
    "deposit",
    [Cl.uint(amount)],
    sender,
  );
}

function registerReferral(under = referrer, sender = referee) {
  return simnet.callPublicFn(
    REFERRALS,
    "register-referral",
    [Cl.principal(under)],
    sender,
  );
}

function recordReward(refereeAddr: string, amount: bigint, sender = backend) {
  return simnet.callPublicFn(
    REFERRALS,
    "record-reward",
    [Cl.principal(refereeAddr), Cl.uint(amount)],
    sender,
  );
}

describe("mozoflix-referrals: registration", () => {
  it("referee links to referrer", () => {
    const { result } = registerReferral();
    expect(result).toBeOk(Cl.bool(true));
    const r = simnet.callReadOnlyFn(
      REFERRALS,
      "get-referrer",
      [Cl.principal(referee)],
      deployer,
    );
    expect(r.result).toBeSome(Cl.principal(referrer));
  });

  it("rejects double registration", () => {
    registerReferral();
    const { result } = registerReferral();
    expect(result).toBeErr(Cl.uint(5001));
  });

  it("rejects self-referral", () => {
    const { result } = simnet.callPublicFn(
      REFERRALS,
      "register-referral",
      [Cl.principal(referee)],
      referee,
    );
    expect(result).toBeErr(Cl.uint(5002));
  });

  it("increments referrer's total-referees stat", () => {
    registerReferral(referrer, referee);
    registerReferral(referrer, other);
    const stats = simnet.callReadOnlyFn(
      REFERRALS,
      "get-stats",
      [Cl.principal(referrer)],
      deployer,
    );
    expect(stats.result).toBeTuple({
      "total-referees": Cl.uint(2),
      "total-earned": Cl.uint(0),
    });
  });

  it("reports active-window true immediately after registration", () => {
    registerReferral();
    const a = simnet.callReadOnlyFn(
      REFERRALS,
      "is-active-referee",
      [Cl.principal(referee)],
      deployer,
    );
    expect(a.result).toBeBool(true);
  });
});

describe("mozoflix-referrals: record-reward", () => {
  beforeEach(() => {
    authorize(backend);
    registerReferral();
  });

  it("authorized backend credits 10% bonus to referrer", () => {
    const { result } = recordReward(referee, REWARD_BASE);
    expect(result).toBeOk(
      Cl.tuple({
        credited: Cl.uint(EXPECTED_BONUS),
        referrer: Cl.principal(referrer),
      }),
    );
    const pending = simnet.callReadOnlyFn(
      REFERRALS,
      "get-pending",
      [Cl.principal(referrer)],
      deployer,
    );
    expect(pending.result).toBeUint(EXPECTED_BONUS);
  });

  it("rejects unauthorized caller", () => {
    const { result } = recordReward(referee, REWARD_BASE, other);
    expect(result).toBeErr(Cl.uint(5000));
  });

  it("rejects zero base amount", () => {
    const { result } = recordReward(referee, 0n);
    expect(result).toBeErr(Cl.uint(5006));
  });

  it("no-ops gracefully when referee has no referrer", () => {
    const { result } = recordReward(other, REWARD_BASE);
    expect(result).toBeOk(
      Cl.tuple({
        credited: Cl.uint(0),
        referrer: Cl.principal(backend),
      }),
    );
  });

  it("accumulates bonus across multiple rewards", () => {
    recordReward(referee, REWARD_BASE);
    recordReward(referee, REWARD_BASE);
    recordReward(referee, REWARD_BASE);
    const pending = simnet.callReadOnlyFn(
      REFERRALS,
      "get-pending",
      [Cl.principal(referrer)],
      deployer,
    );
    expect(pending.result).toBeUint(EXPECTED_BONUS * 3n);
  });

  it("does not credit after 30-day window expires", () => {
    // window is 4320 blocks; mine past it
    simnet.mineEmptyBlocks(4321);
    const { result } = recordReward(referee, REWARD_BASE);
    expect(result).toBeOk(
      Cl.tuple({
        credited: Cl.uint(0),
        referrer: Cl.principal(referrer),
      }),
    );
    const pending = simnet.callReadOnlyFn(
      REFERRALS,
      "get-pending",
      [Cl.principal(referrer)],
      deployer,
    );
    expect(pending.result).toBeUint(0);
  });

  it("is-active-referee flips to false past the window", () => {
    simnet.mineEmptyBlocks(4321);
    const a = simnet.callReadOnlyFn(
      REFERRALS,
      "is-active-referee",
      [Cl.principal(referee)],
      deployer,
    );
    expect(a.result).toBeBool(false);
  });
});

describe("mozoflix-referrals: claim-bonus", () => {
  beforeEach(() => {
    authorize(backend);
    registerReferral();
    deposit(TREASURY_FUND, sponsor);
  });

  it("referrer pulls accrued bonus from treasury", () => {
    recordReward(referee, REWARD_BASE);
    const before = simnet.getAssetsMap().get("STX")?.get(referrer) ?? 0n;
    const { result } = simnet.callPublicFn(REFERRALS, "claim-bonus", [], referrer);
    expect(result).toBeOk(Cl.uint(EXPECTED_BONUS));
    const after = simnet.getAssetsMap().get("STX")?.get(referrer) ?? 0n;
    expect(after - before).toBe(EXPECTED_BONUS);
    const pending = simnet.callReadOnlyFn(
      REFERRALS,
      "get-pending",
      [Cl.principal(referrer)],
      deployer,
    );
    expect(pending.result).toBeUint(0);
  });

  it("nothing-to-claim when pending is zero", () => {
    const { result } = simnet.callPublicFn(REFERRALS, "claim-bonus", [], referrer);
    expect(result).toBeErr(Cl.uint(5004));
  });

  it("treasury too small to cover claim fails cleanly", () => {
    // Sweep treasury before claim is recorded, then accrue.
    simnet.callPublicFn(
      REFERRALS,
      "admin-withdraw",
      [Cl.uint(TREASURY_FUND), Cl.principal(deployer)],
      deployer,
    );
    recordReward(referee, REWARD_BASE);
    const { result } = simnet.callPublicFn(REFERRALS, "claim-bonus", [], referrer);
    expect(result).toBeErr(Cl.uint(5005));
  });

  it("total-paid increments after claim", () => {
    recordReward(referee, REWARD_BASE);
    simnet.callPublicFn(REFERRALS, "claim-bonus", [], referrer);
    const tp = simnet.callReadOnlyFn(REFERRALS, "get-total-paid", [], deployer);
    expect(tp.result).toBeUint(EXPECTED_BONUS);
  });
});

describe("mozoflix-referrals: treasury", () => {
  it("anyone can deposit", () => {
    const { result } = deposit(TREASURY_FUND);
    expect(result).toBeOk(Cl.uint(TREASURY_FUND));
    const t = simnet.callReadOnlyFn(REFERRALS, "get-treasury", [], deployer);
    expect(t.result).toBeUint(TREASURY_FUND);
  });

  it("rejects zero deposit", () => {
    const { result } = deposit(0n);
    expect(result).toBeErr(Cl.uint(5006));
  });

  it("admin-withdraw returns funds", () => {
    deposit(TREASURY_FUND);
    const { result } = simnet.callPublicFn(
      REFERRALS,
      "admin-withdraw",
      [Cl.uint(50_000_000), Cl.principal(deployer)],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(50_000_000));
  });

  it("non-admin cannot admin-withdraw", () => {
    deposit(TREASURY_FUND);
    const { result } = simnet.callPublicFn(
      REFERRALS,
      "admin-withdraw",
      [Cl.uint(1_000_000), Cl.principal(other)],
      other,
    );
    expect(result).toBeErr(Cl.uint(5000));
  });
});

describe("mozoflix-referrals: end-to-end", () => {
  it("register → 3 rewards → claim", () => {
    authorize(backend);
    deposit(TREASURY_FUND, sponsor);
    registerReferral();
    recordReward(referee, REWARD_BASE);
    recordReward(referee, REWARD_BASE * 2n);
    recordReward(referee, REWARD_BASE / 2n);
    const expectedBonus = (REWARD_BASE + REWARD_BASE * 2n + REWARD_BASE / 2n) / 10n;
    const before = simnet.getAssetsMap().get("STX")?.get(referrer) ?? 0n;
    const { result } = simnet.callPublicFn(REFERRALS, "claim-bonus", [], referrer);
    expect(result).toBeOk(Cl.uint(expectedBonus));
    const after = simnet.getAssetsMap().get("STX")?.get(referrer) ?? 0n;
    expect(after - before).toBe(expectedBonus);
    const stats = simnet.callReadOnlyFn(
      REFERRALS,
      "get-stats",
      [Cl.principal(referrer)],
      deployer,
    );
    expect(stats.result).toBeTuple({
      "total-referees": Cl.uint(1),
      "total-earned": Cl.uint(expectedBonus),
    });
  });
});
