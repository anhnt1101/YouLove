/**
 * Generates a random couple room ID matching the pattern LOVE-XXXXXX (e.g. LOVE-A1B2C3)
 */
export function generateCoupleId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return `LOVE-${result}`;
}
