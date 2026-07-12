/** Shared error type for business-rule violations across services (trip, maintenance, ...). */
export class RuleError extends Error {
  status = 400;
}
