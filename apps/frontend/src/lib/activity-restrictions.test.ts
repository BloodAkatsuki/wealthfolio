import { describe, expect, it } from "vitest";

import type { Account } from "@/lib/types";
import {
  accountTypeAllowsActivityType,
  canAddHoldings,
  getAllowedActivityTypes,
  restrictionAllowsType,
} from "./activity-restrictions";

function holdingsAccount(providerAccountId?: string): Account {
  return {
    id: "account",
    name: "Account",
    accountType: "SECURITIES",
    balance: 0,
    currency: "USD",
    isDefault: false,
    isActive: true,
    isArchived: false,
    trackingMode: "HOLDINGS",
    createdAt: new Date("2026-08-05T00:00:00Z"),
    updatedAt: new Date("2026-08-05T00:00:00Z"),
    providerAccountId,
  };
}

describe("canAddHoldings", () => {
  it("allows manual holdings accounts", () => {
    expect(canAddHoldings(holdingsAccount())).toBe(true);
  });

  it("keeps connected holdings read-only outside remediation", () => {
    expect(canAddHoldings(holdingsAccount("provider-account"))).toBe(false);
  });
});

describe("manual holdings activity types", () => {
  it("allows recording a split, which applies to the snapshot quantities", () => {
    expect(getAllowedActivityTypes(holdingsAccount())).toContain("SPLIT");
    expect(restrictionAllowsType("limited", "SPLIT")).toBe(true);
  });

  it("keeps trades on the account page's holdings update", () => {
    expect(getAllowedActivityTypes(holdingsAccount())).not.toContain("BUY");
    expect(restrictionAllowsType("limited", "SELL")).toBe(false);
  });

  it("keeps connected holdings sync-only", () => {
    expect(getAllowedActivityTypes(holdingsAccount("provider-account"))).toEqual([]);
  });
});

describe("crypto account activity types", () => {
  const cryptoAccount = (trackingMode: Account["trackingMode"]): Account => ({
    ...holdingsAccount(),
    accountType: "CRYPTOCURRENCY",
    trackingMode,
  });

  it("offers no dividends or splits, since coins neither pay nor split", () => {
    for (const mode of ["TRANSACTIONS", "HOLDINGS"] as const) {
      const allowed = getAllowedActivityTypes(cryptoAccount(mode));
      expect(allowed).not.toContain("DIVIDEND");
      expect(allowed).not.toContain("SPLIT");
      expect(allowed).toContain("INTEREST");
    }
    expect(getAllowedActivityTypes(cryptoAccount("TRANSACTIONS"))).toEqual(
      expect.arrayContaining(["BUY", "SELL", "TRANSFER", "DEPOSIT", "WITHDRAWAL", "FEE"]),
    );
  });

  it("keeps dividends and splits for other account types", () => {
    for (const type of ["DIVIDEND", "SPLIT"]) {
      expect(accountTypeAllowsActivityType("CRYPTOCURRENCY", type)).toBe(false);
      expect(accountTypeAllowsActivityType("SECURITIES", type)).toBe(true);
      expect(accountTypeAllowsActivityType(undefined, type)).toBe(true);
    }
  });
});
