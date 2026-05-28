export const APP_ROLES = ["admin", "staff", "pt", "customer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type Actor = {
  userId: string;
  role: AppRole | string;
};

export type BookingSubject = {
  customerId: string;
  ptId?: string | null;
};

export type BookingAction = "view" | "accept" | "decline" | "cancel" | "reschedule" | "complete";

export type CustomerSubject = {
  id: string;
  assignedPtId?: string | null;
};

export type SupportTicketSubject = {
  customerId: string;
  assignedStaffId?: string | null;
  assignedPtId?: string | null;
};

export type SupportTicketAction = "view" | "triage" | "resolve";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  staff: "Staff",
  pt: "PT",
  customer: "Customer",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown): AppRole {
  return isAppRole(value) ? value : "customer";
}

export function hasAnyRole(actor: Actor | null | undefined, roles: readonly AppRole[]): boolean {
  return !!actor && isAppRole(actor.role) && roles.includes(actor.role);
}

export function canManageUser(actor: Actor | null | undefined): boolean {
  return hasAnyRole(actor, ["admin"]);
}

export function canViewRoleWorkspace(
  actor: Actor | null | undefined,
  workspace: Exclude<AppRole, "customer">,
): boolean {
  if (!actor || !isAppRole(actor.role)) return false;
  return actor.role === "admin" || actor.role === workspace;
}

export function canManageBooking(
  actor: Actor | null | undefined,
  booking: BookingSubject,
  action: BookingAction,
): boolean {
  if (!actor || !isAppRole(actor.role)) return false;
  if (actor.role === "admin" || actor.role === "staff") return true;

  const isOwningCustomer = actor.role === "customer" && booking.customerId === actor.userId;
  const isAssignedPt = actor.role === "pt" && booking.ptId === actor.userId;

  if (action === "view") return isOwningCustomer || isAssignedPt;
  if (action === "accept" || action === "decline" || action === "complete") return isAssignedPt;
  if (action === "cancel" || action === "reschedule") return isOwningCustomer || isAssignedPt;
  return false;
}

export function canViewCustomerFitnessData(
  actor: Actor | null | undefined,
  customer: CustomerSubject,
): boolean {
  if (!actor || !isAppRole(actor.role)) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "customer") return actor.userId === customer.id;
  if (actor.role === "pt") return customer.assignedPtId === actor.userId;
  return false;
}

export function canManageSupportTicket(
  actor: Actor | null | undefined,
  ticket: SupportTicketSubject,
  action: SupportTicketAction,
): boolean {
  if (!actor || !isAppRole(actor.role)) return false;
  if (actor.role === "admin" || actor.role === "staff") return true;
  if (actor.role === "pt") return ticket.assignedPtId === actor.userId;
  if (actor.role === "customer") return action === "view" && ticket.customerId === actor.userId;
  return false;
}
