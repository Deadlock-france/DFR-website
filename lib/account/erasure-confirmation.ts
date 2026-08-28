export const ACCOUNT_ERASURE_CONFIRMATION = "Supprimer";

export function isAccountErasureConfirmation(value: string): boolean {
  return value.trim() === ACCOUNT_ERASURE_CONFIRMATION;
}
