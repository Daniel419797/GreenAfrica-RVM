export function validNigerianPhone(input: string): boolean {
  const digits = input.replace(/[\s-]/g, '');
  return /^(?:\+234|0)[789][01]\d{8}$/.test(digits);
}
export function validRedeemAmount(n: number, balance: number | null): boolean {
  return Number.isInteger(n) && n >= 50 && n <= 5000 && balance !== null && n <= balance;
}
