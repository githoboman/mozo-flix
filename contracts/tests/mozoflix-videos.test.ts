import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const other = accounts.get("wallet_2")!;

const VIDEOS = "mozoflix-videos";

const HASH = Cl.bufferFromHex("a".repeat(64));
const REWARD = Cl.uint(1_000_000); // 1 STX
const THRESHOLD = Cl.uint(70);

function register(sender = creator) {
  return simnet.callPublicFn(
    VIDEOS,
    "register-video",
    [HASH, REWARD, THRESHOLD],
    sender,
  );
}

describe("mozoflix-videos: registration", () => {
  it("first registered video has id 1", () => {
    const { result } = register();
    expect(result).toBeOk(Cl.uint(1));
  });

  it("increments video ids and total count", () => {
    register();
    const r2 = register();
    expect(r2.result).toBeOk(Cl.uint(2));
    const total = simnet.callReadOnlyFn(VIDEOS, "get-total-videos", [], deployer);
    expect(total.result).toBeUint(2);
  });

  it("rejects empty content hash", () => {
    const { result } = simnet.callPublicFn(
      VIDEOS,
      "register-video",
      [Cl.bufferFromHex(""), REWARD, THRESHOLD],
      creator,
    );
    expect(result).toBeErr(Cl.uint(2004));
  });

  it("rejects zero reward", () => {
    const { result } = simnet.callPublicFn(
      VIDEOS,
      "register-video",
      [HASH, Cl.uint(0), THRESHOLD],
      creator,
    );
    expect(result).toBeErr(Cl.uint(2003));
  });

  it("rejects threshold above 100", () => {
    const { result } = simnet.callPublicFn(
      VIDEOS,
      "register-video",
      [HASH, REWARD, Cl.uint(101)],
      creator,
    );
    expect(result).toBeErr(Cl.uint(2002));
  });

  it("rejects threshold of 0", () => {
    const { result } = simnet.callPublicFn(
      VIDEOS,
      "register-video",
      [HASH, REWARD, Cl.uint(0)],
      creator,
    );
    expect(result).toBeErr(Cl.uint(2002));
  });
});

describe("mozoflix-videos: queries", () => {
  it("returns video tuple after registration", () => {
    const heightAtRegister = simnet.blockHeight;
    register();
    const { result } = simnet.callReadOnlyFn(VIDEOS, "get-video", [Cl.uint(1)], deployer);
    expect(result).toBeSome(
      Cl.tuple({
        creator: Cl.principal(creator),
        "content-hash": HASH,
        "reward-per-view": REWARD,
        "min-completion-pct": THRESHOLD,
        active: Cl.bool(true),
        "created-at": Cl.uint(heightAtRegister + 1),
      }),
    );
  });

  it("get-video returns none for unknown id", () => {
    const { result } = simnet.callReadOnlyFn(VIDEOS, "get-video", [Cl.uint(99)], deployer);
    expect(result).toBeNone();
  });

  it("is-active returns false for unknown id", () => {
    const { result } = simnet.callReadOnlyFn(VIDEOS, "is-active", [Cl.uint(99)], deployer);
    expect(result).toBeBool(false);
  });
});

describe("mozoflix-videos: creator-only updates", () => {
  it("creator can deactivate their video", () => {
    register();
    const tx = simnet.callPublicFn(
      VIDEOS,
      "set-video-active",
      [Cl.uint(1), Cl.bool(false)],
      creator,
    );
    expect(tx.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn(VIDEOS, "is-active", [Cl.uint(1)], deployer).result,
    ).toBeBool(false);
  });

  it("non-creator cannot deactivate", () => {
    register();
    const tx = simnet.callPublicFn(
      VIDEOS,
      "set-video-active",
      [Cl.uint(1), Cl.bool(false)],
      other,
    );
    expect(tx.result).toBeErr(Cl.uint(2000));
  });

  it("creator can update reward rate", () => {
    register();
    const tx = simnet.callPublicFn(
      VIDEOS,
      "update-reward-rate",
      [Cl.uint(1), Cl.uint(2_000_000)],
      creator,
    );
    expect(tx.result).toBeOk(Cl.bool(true));
    const r = simnet.callReadOnlyFn(VIDEOS, "get-reward-rate", [Cl.uint(1)], deployer);
    expect(r.result).toBeOk(Cl.uint(2_000_000));
  });

  it("non-creator cannot update reward rate", () => {
    register();
    const tx = simnet.callPublicFn(
      VIDEOS,
      "update-reward-rate",
      [Cl.uint(1), Cl.uint(2_000_000)],
      other,
    );
    expect(tx.result).toBeErr(Cl.uint(2000));
  });

  it("creator can update threshold", () => {
    register();
    const tx = simnet.callPublicFn(
      VIDEOS,
      "update-threshold",
      [Cl.uint(1), Cl.uint(85)],
      creator,
    );
    expect(tx.result).toBeOk(Cl.bool(true));
  });

  it("update on missing video errors", () => {
    const tx = simnet.callPublicFn(
      VIDEOS,
      "set-video-active",
      [Cl.uint(42), Cl.bool(false)],
      creator,
    );
    expect(tx.result).toBeErr(Cl.uint(2001));
  });
});
