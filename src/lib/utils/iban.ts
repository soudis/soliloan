/**
 * Validates an IBAN number according to the ISO 13616 standard
 * @param iban The IBAN number to validate (can include spaces)
 * @returns true if the IBAN is valid, false otherwise
 */
export function isValidIban(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanIban = normalizeIban(iban);

  // Check basic format
  if (!/^[A-Z]{2}[0-9A-Z]{2,34}$/.test(cleanIban)) {
    return false;
  }

  // Move first 4 chars to end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, etc.)
  const converted = rearranged
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        // A-Z
        return (code - 55).toString();
      }
      return char;
    })
    .join('');

  // Check if the number is divisible by 97
  const remainder = BigInt(converted) % BigInt(97);
  return remainder === BigInt(1);
}

/** Strip non-alphanumeric characters and uppercase (storage-safe IBAN normalization). */
export function normalizeIban(iban: string): string {
  return iban.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** Split IBAN into ISO 13616 display groups of four characters. */
export function splitIbanIntoGroups(iban: string): string[] {
  const normalized = normalizeIban(iban);
  if (!normalized) return [];
  return normalized.match(/.{1,4}/g) ?? [];
}

/** Format IBAN for display with a single space between each group. */
export function formatIban(iban: string): string {
  return splitIbanIntoGroups(iban).join(' ');
}
