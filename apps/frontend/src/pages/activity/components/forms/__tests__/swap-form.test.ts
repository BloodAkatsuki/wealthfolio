import { describe, expect, it } from "vitest";
import { mapActivityTypeToPicker } from "../../../utils/activity-form-utils";
import { swapFormSchema, swapValues } from "../swap-form";

/** 10 SOL, 0.01 of it as network fee, for 9.2 JitoSOL at 150 USD per SOL. */
const solToJitoSol = {
  accountId: "wallet",
  activityDate: new Date("2026-10-01T12:00:00Z"),
  fromSymbol: "SOL",
  fromQuantity: 10,
  unitPrice: 150,
  feeQuantity: 0.01,
  toSymbol: "JITOSOL",
  toQuantity: 9.2,
  currency: "USD",
};

describe("swapValues", () => {
  it("values the given units net of the fee and prices the received units", () => {
    const { value, receivedUnitPrice } = swapValues(solToJitoSol);

    expect(value).toBeCloseTo(1498.5, 10);
    expect(receivedUnitPrice).toBeCloseTo(1498.5 / 9.2, 10);
  });

  it("has no value until quantity and price are known", () => {
    expect(swapValues({ ...solToJitoSol, unitPrice: undefined })).toEqual({});
    expect(swapValues({ ...solToJitoSol, fromQuantity: 0 })).toEqual({});
  });

  it("has no value when the fee would consume everything given", () => {
    expect(swapValues({ ...solToJitoSol, feeQuantity: 10 })).toEqual({});
  });

  it("values the swap before the received quantity is entered", () => {
    const { value, receivedUnitPrice } = swapValues({ ...solToJitoSol, toQuantity: undefined });

    expect(value).toBeCloseTo(1498.5, 10);
    expect(receivedUnitPrice).toBeUndefined();
  });
});

describe("swapFormSchema", () => {
  it("accepts a complete swap", () => {
    expect(swapFormSchema.safeParse(solToJitoSol).success).toBe(true);
  });

  it("accepts a swap without a network fee", () => {
    expect(swapFormSchema.safeParse({ ...solToJitoSol, feeQuantity: null }).success).toBe(true);
  });

  it.each([
    ["zero quantity given", { fromQuantity: 0 }, "fromQuantity"],
    ["negative quantity received", { toQuantity: -1 }, "toQuantity"],
    ["zero price", { unitPrice: 0 }, "unitPrice"],
    ["negative fee", { feeQuantity: -0.01 }, "feeQuantity"],
    ["fee as large as the quantity given", { feeQuantity: 10 }, "feeQuantity"],
    ["the same asset on both sides", { toSymbol: " sol " }, "toSymbol"],
    ["no asset received", { toSymbol: "" }, "toSymbol"],
    ["no account", { accountId: "" }, "accountId"],
  ])("rejects %s", (_name, change, path) => {
    const result = swapFormSchema.safeParse({ ...solToJitoSol, ...change });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(path);
  });

  it("allows one symbol on two different exchanges", () => {
    const result = swapFormSchema.safeParse({
      ...solToJitoSol,
      fromExchangeMic: "XNAS",
      toSymbol: "SOL",
      toExchangeMic: "XTSE",
    });

    expect(result.success).toBe(true);
  });
});

describe("mapActivityTypeToPicker", () => {
  it("opens either leg of a swap in the swap editor", () => {
    expect(mapActivityTypeToPicker("SELL", "SWAP")).toBe("SWAP");
    expect(mapActivityTypeToPicker("BUY", "swap")).toBe("SWAP");
  });

  it("keeps ordinary trades and transfers on their own editors", () => {
    expect(mapActivityTypeToPicker("SELL")).toBe("SELL");
    expect(mapActivityTypeToPicker("BUY", "POSITION_CLOSE")).toBe("BUY");
    expect(mapActivityTypeToPicker("TRANSFER_IN", "SWAP")).toBe("TRANSFER");
  });
});
