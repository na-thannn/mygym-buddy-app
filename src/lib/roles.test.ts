import { describe, expect, it } from "vitest";
import {
  canManageBooking,
  canManageSupportTicket,
  canManageUser,
  canViewCustomerFitnessData,
  canViewRoleWorkspace,
  isAppRole,
  type AppRole,
} from "./roles";

const actor = (role: AppRole, userId = `${role}-1`) => ({ userId, role });
const booking = (overrides: Partial<{ customerId: string; ptId: string | null }> = {}) => ({
  customerId: "customer-1",
  ptId: "pt-1",
  ...overrides,
});
const ticket = (
  overrides: Partial<{
    customerId: string;
    assignedStaffId: string | null;
    assignedPtId: string | null;
  }> = {},
) => ({
  customerId: "customer-1",
  assignedStaffId: "staff-1",
  assignedPtId: "pt-1",
  ...overrides,
});

describe("role helpers", () => {
  it("recognizes the four supported app roles", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("staff")).toBe(true);
    expect(isAppRole("pt")).toBe(true);
    expect(isAppRole("customer")).toBe(true);
    expect(isAppRole("owner")).toBe(false);
  });

  it("limits user management to admins", () => {
    expect(canManageUser(actor("admin"))).toBe(true);
    expect(canManageUser(actor("staff"))).toBe(false);
    expect(canManageUser(actor("pt"))).toBe(false);
    expect(canManageUser(actor("customer"))).toBe(false);
  });

  it("keeps role workspaces visible only to matching operational roles and admins", () => {
    expect(canViewRoleWorkspace(actor("admin"), "staff")).toBe(true);
    expect(canViewRoleWorkspace(actor("admin"), "pt")).toBe(true);
    expect(canViewRoleWorkspace(actor("staff"), "staff")).toBe(true);
    expect(canViewRoleWorkspace(actor("pt"), "pt")).toBe(true);
    expect(canViewRoleWorkspace(actor("customer"), "pt")).toBe(false);
    expect(canViewRoleWorkspace(actor("staff"), "pt")).toBe(false);
  });

  it("allows only assigned PTs, admins, staff, or the owning customer to view a booking", () => {
    expect(canManageBooking(actor("admin"), booking(), "view")).toBe(true);
    expect(canManageBooking(actor("staff"), booking(), "view")).toBe(true);
    expect(canManageBooking(actor("pt", "pt-1"), booking(), "view")).toBe(true);
    expect(canManageBooking(actor("pt", "pt-2"), booking(), "view")).toBe(false);
    expect(canManageBooking(actor("customer", "customer-1"), booking(), "view")).toBe(true);
    expect(canManageBooking(actor("customer", "customer-2"), booking(), "view")).toBe(false);
  });

  it("restricts booking state changes by role and relationship", () => {
    expect(canManageBooking(actor("admin"), booking(), "accept")).toBe(true);
    expect(canManageBooking(actor("staff"), booking(), "decline")).toBe(true);
    expect(canManageBooking(actor("pt", "pt-1"), booking(), "complete")).toBe(true);
    expect(canManageBooking(actor("pt", "pt-2"), booking(), "complete")).toBe(false);
    expect(canManageBooking(actor("customer", "customer-1"), booking(), "cancel")).toBe(true);
    expect(canManageBooking(actor("customer", "customer-1"), booking(), "complete")).toBe(false);
    expect(canManageBooking(actor("customer", "customer-2"), booking(), "cancel")).toBe(false);
  });

  it("keeps fitness data scoped to the customer, assigned PT, and admins", () => {
    const customer = { id: "customer-1", assignedPtId: "pt-1" };
    expect(canViewCustomerFitnessData(actor("admin"), customer)).toBe(true);
    expect(canViewCustomerFitnessData(actor("staff"), customer)).toBe(false);
    expect(canViewCustomerFitnessData(actor("pt", "pt-1"), customer)).toBe(true);
    expect(canViewCustomerFitnessData(actor("pt", "pt-2"), customer)).toBe(false);
    expect(canViewCustomerFitnessData(actor("customer", "customer-1"), customer)).toBe(true);
    expect(canViewCustomerFitnessData(actor("customer", "customer-2"), customer)).toBe(false);
  });

  it("scopes support tickets to operations staff, assigned PTs, and owning customers", () => {
    expect(canManageSupportTicket(actor("admin"), ticket(), "view")).toBe(true);
    expect(canManageSupportTicket(actor("staff", "staff-2"), ticket(), "view")).toBe(true);
    expect(canManageSupportTicket(actor("staff", "staff-2"), ticket(), "triage")).toBe(true);
    expect(canManageSupportTicket(actor("pt", "pt-1"), ticket(), "view")).toBe(true);
    expect(canManageSupportTicket(actor("pt", "pt-1"), ticket(), "resolve")).toBe(true);
    expect(canManageSupportTicket(actor("pt", "pt-2"), ticket(), "view")).toBe(false);
    expect(canManageSupportTicket(actor("customer", "customer-1"), ticket(), "view")).toBe(true);
    expect(canManageSupportTicket(actor("customer", "customer-1"), ticket(), "resolve")).toBe(
      false,
    );
    expect(canManageSupportTicket(actor("customer", "customer-2"), ticket(), "view")).toBe(false);
  });
});
