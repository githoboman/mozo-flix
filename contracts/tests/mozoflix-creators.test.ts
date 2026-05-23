import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const other = accounts.get("wallet_2")!;
const backend = accounts.get("wallet_3")!;

const ADMIN = "mozoflix-admin";
const CREATORS = "mozoflix-creators";

const NAME = Cl.stringAscii("SilkyJones");
const BIO = Cl.stringUtf8("Building on Stacks since 2023.");
const AVATAR = Cl.bufferFromHex("c".repeat(64));

function register(sender = creator) {
  return simnet.callPublicFn(
    CREATORS,
    "register-profile",
    [NAME, BIO, AVATAR],
    sender,
  );
}

describe("mozoflix-creators: registration", () => {
  it("registers a new profile", () => {
    const { result } = register();
    expect(result).toBeOk(Cl.bool(true));
    const total = simnet.callReadOnlyFn(CREATORS, "get-total-creators", [], deployer);
    expect(total.result).toBeUint(1);
  });

  it("rejects duplicate registration", () => {
    register();
    const { result } = register();
    expect(result).toBeErr(Cl.uint(4002));
  });

  it("rejects empty display-name", () => {
    const { result } = simnet.callPublicFn(
      CREATORS,
      "register-profile",
      [Cl.stringAscii(""), BIO, AVATAR],
      creator,
    );
    expect(result).toBeErr(Cl.uint(4003));
  });

  it("stores expected fields", () => {
    const heightBefore = simnet.blockHeight;
    register();
    const { result } = simnet.callReadOnlyFn(
      CREATORS,
      "get-profile",
      [Cl.principal(creator)],
      deployer,
    );
    expect(result).toBeSome(
      Cl.tuple({
        "display-name": NAME,
        bio: BIO,
        "avatar-hash": AVATAR,
        verified: Cl.bool(false),
        "joined-at": Cl.uint(heightBefore + 1),
        reputation: Cl.uint(0),
      }),
    );
  });
});

describe("mozoflix-creators: updates", () => {
  it("creator can update their profile", () => {
    const heightBefore = simnet.blockHeight;
    register();
    const newName = Cl.stringAscii("SilkyJonesV2");
    const newBio = Cl.stringUtf8("Now with 100% more Clarity.");
    const tx = simnet.callPublicFn(
      CREATORS,
      "update-profile",
      [newName, newBio, AVATAR],
      creator,
    );
    expect(tx.result).toBeOk(Cl.bool(true));
    const profile = simnet.callReadOnlyFn(
      CREATORS,
      "get-profile",
      [Cl.principal(creator)],
      deployer,
    );
    expect(profile.result).toBeSome(
      Cl.tuple({
        "display-name": newName,
        bio: newBio,
        "avatar-hash": AVATAR,
        verified: Cl.bool(false),
        "joined-at": Cl.uint(heightBefore + 1),
        reputation: Cl.uint(0),
      }),
    );
  });

  it("non-registered user cannot update", () => {
    const tx = simnet.callPublicFn(
      CREATORS,
      "update-profile",
      [NAME, BIO, AVATAR],
      other,
    );
    expect(tx.result).toBeErr(Cl.uint(4001));
  });

  it("rejects empty name on update", () => {
    register();
    const tx = simnet.callPublicFn(
      CREATORS,
      "update-profile",
      [Cl.stringAscii(""), BIO, AVATAR],
      creator,
    );
    expect(tx.result).toBeErr(Cl.uint(4003));
  });
});

describe("mozoflix-creators: admin verification + reputation", () => {
  it("non-admin cannot verify", () => {
    register();
    const tx = simnet.callPublicFn(
      CREATORS,
      "set-verified",
      [Cl.principal(creator), Cl.bool(true)],
      other,
    );
    expect(tx.result).toBeErr(Cl.uint(4000));
  });

  it("owner can toggle verified flag", () => {
    register();
    const tx = simnet.callPublicFn(
      CREATORS,
      "set-verified",
      [Cl.principal(creator), Cl.bool(true)],
      deployer,
    );
    expect(tx.result).toBeOk(Cl.bool(true));
    const v = simnet.callReadOnlyFn(
      CREATORS,
      "is-verified",
      [Cl.principal(creator)],
      deployer,
    );
    expect(v.result).toBeBool(true);
  });

  it("authorized backend (delegated) can verify too", () => {
    register();
    simnet.callPublicFn(
      ADMIN,
      "set-authorized",
      [Cl.principal(backend), Cl.bool(true)],
      deployer,
    );
    const tx = simnet.callPublicFn(
      CREATORS,
      "set-verified",
      [Cl.principal(creator), Cl.bool(true)],
      backend,
    );
    expect(tx.result).toBeOk(Cl.bool(true));
  });

  it("cannot verify a non-registered creator", () => {
    const tx = simnet.callPublicFn(
      CREATORS,
      "set-verified",
      [Cl.principal(other), Cl.bool(true)],
      deployer,
    );
    expect(tx.result).toBeErr(Cl.uint(4001));
  });

  it("admin can push reputation score", () => {
    register();
    const tx = simnet.callPublicFn(
      CREATORS,
      "set-reputation",
      [Cl.principal(creator), Cl.uint(847)],
      deployer,
    );
    expect(tx.result).toBeOk(Cl.bool(true));
    const r = simnet.callReadOnlyFn(
      CREATORS,
      "get-reputation",
      [Cl.principal(creator)],
      deployer,
    );
    expect(r.result).toBeUint(847);
  });

  it("non-admin cannot push reputation", () => {
    register();
    const tx = simnet.callPublicFn(
      CREATORS,
      "set-reputation",
      [Cl.principal(creator), Cl.uint(999)],
      other,
    );
    expect(tx.result).toBeErr(Cl.uint(4000));
  });
});
