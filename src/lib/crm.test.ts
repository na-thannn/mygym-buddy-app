import { describe, expect, it } from "vitest";
import {
  canTransitionPurchaseRequest,
  canManagePtServices,
  formatVnd,
  getMembershipRuntimeStatus,
  sumManualPayments,
  type PurchaseRequestStatus,
} from "./crm";
import type { AppRole } from "./roles";

describe("CRM domain helpers", () => {
  it("marks active memberships as expired after their end date", () => {
    expect(
      getMembershipRuntimeStatus({
        status: "active",
        endsOn: "2026-06-30",
        today: "2026-06-08",
      }),
    ).toBe("active");

    expect(
      getMembershipRuntimeStatus({
        status: "active",
        endsOn: "2026-06-01",
        today: "2026-06-08",
      }),
    ).toBe("expired");
  });

  it("keeps paused and cancelled memberships out of active runtime status", () => {
    expect(
      getMembershipRuntimeStatus({
        status: "paused",
        endsOn: "2026-06-30",
        today: "2026-06-08",
      }),
    ).toBe("paused");
    expect(
      getMembershipRuntimeStatus({
        status: "cancelled",
        endsOn: "2026-06-30",
        today: "2026-06-08",
      }),
    ).toBe("cancelled");
  });

  it("allows customers to cancel only their own requested package requests", () => {
    expect(
      canTransitionPurchaseRequest({
        actor: { role: "customer" as AppRole, userId: "customer-1" },
        customerId: "customer-1",
        from: "requested",
        to: "cancelled",
      }),
    ).toBe(true);
    expect(
      canTransitionPurchaseRequest({
        actor: { role: "customer" as AppRole, userId: "customer-1" },
        customerId: "customer-2",
        from: "requested",
        to: "cancelled",
      }),
    ).toBe(false);
    expect(
      canTransitionPurchaseRequest({
        actor: { role: "customer" as AppRole, userId: "customer-1" },
        customerId: "customer-1",
        from: "approved",
        to: "paid",
      }),
    ).toBe(false);
  });

  it.each<PurchaseRequestStatus>(["contacted", "approved", "rejected", "paid", "activated"])(
    "allows managers to move requested package requests to %s",
    (nextStatus) => {
      expect(
        canTransitionPurchaseRequest({
          actor: { role: "manager" as AppRole, userId: "manager-1" },
          customerId: "customer-1",
          from: "requested",
          to: nextStatus,
        }),
      ).toBe(true);
    },
  );

  it("totals only successful manual payments", () => {
    expect(
      sumManualPayments([
        { amountVnd: 180000, status: "recorded" },
        { amountVnd: 200000, status: "voided" },
        { amountVnd: 2500000, status: "recorded" },
      ]),
    ).toBe(2680000);
  });

  it("limits PT service management to managers or the owning PT", () => {
    expect(canManagePtServices({ role: "manager" as AppRole, userId: "manager-1" }, "pt-1")).toBe(
      true,
    );
    expect(canManagePtServices({ role: "pt" as AppRole, userId: "pt-1" }, "pt-1")).toBe(true);
    expect(canManagePtServices({ role: "pt" as AppRole, userId: "pt-2" }, "pt-1")).toBe(false);
    expect(canManagePtServices({ role: "customer" as AppRole, userId: "customer-1" }, "customer-1")).toBe(
      false,
    );
  });

  it("formats VND prices for public sales copy", () => {
    expect(formatVnd(180000)).toBe("180,000 VND");
    expect(formatVnd(2500000)).toBe("2,500,000 VND");
  });
});
