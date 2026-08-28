/** SteamID64 universel = account_id (SteamID32) + cette base. */
export const STEAM64_BASE = BigInt("76561197960265728");
const STEAM32_MAX = BigInt("4294967295");

/**
 * Convertit un identifiant Steam (32 ou 64 bits) en account_id Deadlock / SteamID3.
 */
export function toSteamAccountId(
  raw: string | number | bigint | null | undefined,
): number | null {
  if (raw == null) return null;

  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) return null;

  let value = BigInt(text);
  if (value >= STEAM64_BASE) {
    value -= STEAM64_BASE;
  }

  if (value <= BigInt(0) || value > STEAM32_MAX) return null;
  return Number(value);
}
