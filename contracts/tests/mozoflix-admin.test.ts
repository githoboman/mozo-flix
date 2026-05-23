import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const ADMIN = "mozoflix-admin";

describe("mozoflix-admin: defaults", () => {
  it("deployer is the initial owner", () => {
    const { result } = simnet.callReadOnlyFn(ADMIN, "get-owner", [], wallet1);
    expect(result).toBePrincipal(deployer);
  });

  it("default fee is 500 bps (5%)", () => {
    const { result } = simnet.callReadOnlyFn(ADMIN, "get-fee-bps", [], wallet1);
    expect(result).toBeUint(500);
  });

  it("starts unpaused", () => {
    const { result } = simnet.callReadOnlyFn(ADMIN, "is-paused", [], wallet1);
    expect(result).toBeBool(false);
  });

  it("calc-fee splits 5% correctly", () => {
    const { result } = simnet.callReadOnlyFn(
      ADMIN,
      "calc-fee",
      [Cl.uint(10_000_000)],
      wallet1,
    );
    expect(result).toBeTuple({ fee: Cl.uint(500_000), net: Cl.uint(9_500_000) });
  });

  it("owner is authorized by default; non-owner is not", () => {
    const a = simnet.callReadOnlyFn(ADMIN, "is-authorized", [Cl.principal(deployer)], wallet1);
    expect(a.result).toBeBool(true);
    const b = simnet.callReadOnlyFn(ADMIN, "is-authorized", [Cl.principal(wallet1)], wallet1);
    expect(b.result).toBeBool(false);
  });
});

describe("mozoflix-admin: owner-only mutations", () => {
  it("non-owner cannot set fee bps", () => {
    const { result } = simnet.callPublicFn(ADMIN, "set-fee-bps", [Cl.uint(200)], wallet1);
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("owner can set fee bps within cap", () => {
    const { result } = simnet.callPublicFn(ADMIN, "set-fee-bps", [Cl.uint(750)], deployer);
    expect(result).toBeOk(Cl.bool(true));
    const { result: get } = simnet.callReadOnlyFn(ADMIN, "get-fee-bps", [], wallet1);
    expect(get).toBeUint(750);
  });

  it("owner cannot exceed 10% cap", () => {
    const { result } = simnet.callPublicFn(ADMIN, "set-fee-bps", [Cl.uint(1500)], deployer);
    expect(result).toBeErr(Cl.uint(1001));
  });

  it("owner can pause and unpause", () => {
    const a = simnet.callPublicFn(ADMIN, "set-paused", [Cl.bool(true)], deployer);
    expect(a.result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(ADMIN, "is-paused", [], wallet1).result).toBeBool(true);

    const b = simnet.callPublicFn(ADMIN, "set-paused", [Cl.bool(false)], deployer);
    expect(b.result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(ADMIN, "is-paused", [], wallet1).result).toBeBool(false);
  });

  it("non-owner cannot pause", () => {
    const { result } = simnet.callPublicFn(ADMIN, "set-paused", [Cl.bool(true)], wallet1);
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("owner can authorize and revoke a backend caller", () => {
    const setA = simnet.callPublicFn(
      ADMIN,
      "set-authorized",
      [Cl.principal(wallet2), Cl.bool(true)],
      deployer,
    );
    expect(setA.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn(ADMIN, "is-authorized", [Cl.principal(wallet2)], wallet1).result,
    ).toBeBool(true);

    const setB = simnet.callPublicFn(
      ADMIN,
      "set-authorized",
      [Cl.principal(wallet2), Cl.bool(false)],
      deployer,
    );
    expect(setB.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn(ADMIN, "is-authorized", [Cl.principal(wallet2)], wallet1).result,
    ).toBeBool(false);
  });

  it("ownership transfer locks out the old owner", () => {
    const transfer = simnet.callPublicFn(
      ADMIN,
      "set-owner",
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(transfer.result).toBeOk(Cl.bool(true));

    // old owner can no longer mutate
    const old = simnet.callPublicFn(ADMIN, "set-fee-bps", [Cl.uint(100)], deployer);
    expect(old.result).toBeErr(Cl.uint(1000));

    // new owner can
    const fresh = simnet.callPublicFn(ADMIN, "set-fee-bps", [Cl.uint(100)], wallet1);
    expect(fresh.result).toBeOk(Cl.bool(true));
  });
});
