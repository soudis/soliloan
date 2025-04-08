/**
 * Validates an IBAN number according to the ISO 13616 standard
 * @param iban The IBAN number to validate (can include spaces)
 * @returns true if the IBAN is valid, false otherwise
 */
export function isValidIban(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase()

  // Check basic format
  if (!/^[A-Z]{2}[0-9A-Z]{2,34}$/.test(cleanIban)) {
    return false
  }

  // Move first 4 chars to end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4)

  // Convert letters to numbers (A=10, B=11, etc.)
  const converted = rearranged.split('').map(char => {
    const code = char.charCodeAt(0)
    if (code >= 65 && code <= 90) { // A-Z
      return (code - 55).toString()
    }
    return char
  }).join('')

  // Check if the number is divisible by 97
  const remainder = BigInt(converted) % BigInt(97)
  return remainder === BigInt(1)
} 