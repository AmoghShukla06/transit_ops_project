/** The four RBAC roles, shared across login, signup, and the Google complete-profile page. */
export const ROLES = [
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "safety_officer", label: "Safety Officer" },
  { value: "financial_analyst", label: "Financial Analyst" },
] as const;

export type RoleValue = (typeof ROLES)[number]["value"];

export function isRoleValue(value: string): value is RoleValue {
  return ROLES.some((r) => r.value === value);
}

/** Non-empty literal tuple of role values, shaped for z.enum() — keeps the literal
 * union (not widened to `string`) so it matches Prisma's UserRole without casting. */
export const ROLE_VALUES = ROLES.map((r) => r.value) as [RoleValue, ...RoleValue[]];
