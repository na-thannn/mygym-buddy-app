import type { Actor, AppRole } from "./roles";

export const MEMBERSHIP_STATUSES = ["active", "paused", "cancelled", "expired"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const PURCHASE_REQUEST_STATUSES = [
  "requested",
  "contacted",
  "approved",
  "rejected",
  "paid",
  "activated",
  "cancelled",
] as const;
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export type ManualPaymentStatus = "recorded" | "voided";

export function getMembershipRuntimeStatus({
  status,
  endsOn,
  today,
}: {
  status: MembershipStatus;
  endsOn: string;
  today: string;
}): MembershipStatus {
  if (status !== "active") return status;
  return endsOn < today ? "expired" : "active";
}

export function canTransitionPurchaseRequest({
  actor,
  customerId,
  from,
  to,
}: {
  actor: Actor;
  customerId: string;
  from: PurchaseRequestStatus;
  to: PurchaseRequestStatus;
}): boolean {
  if (actor.role === "admin" || actor.role === "manager") {
    if (from === "activated") return to === "cancelled";
    return true;
  }

  if (actor.role !== "customer" || actor.userId !== customerId) return false;
  return from === "requested" && to === "cancelled";
}

export function canManageCrm(actor: Actor | null | undefined): boolean {
  return actor?.role === "admin" || actor?.role === "manager";
}

export function canManagePtServices(actor: Actor | null | undefined, ptId: string): boolean {
  return actor?.role === "admin" || actor?.role === "manager" || (actor?.role === "pt" && actor.userId === ptId);
}

export function sumManualPayments(
  payments: Array<{ amountVnd: number; status: ManualPaymentStatus | string }>,
): number {
  return payments
    .filter((payment) => payment.status === "recorded")
    .reduce((sum, payment) => sum + payment.amountVnd, 0);
}

export function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} VND`;
}

export function isOperationalRole(role: AppRole | string): role is Extract<AppRole, "admin" | "manager"> {
  return role === "admin" || role === "manager";
}
