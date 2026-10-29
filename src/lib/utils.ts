export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

export function calculateMinutes(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0
  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)

  const inMinutes = inH * 60 + inM
  const outMinutes = outH * 60 + outM

  const diff = outMinutes - inMinutes
  return diff > 0 ? diff : 0
}

export function formatMinutesToHoursAndMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}시간 ${remainingMinutes.toString().padStart(2, '0')}분`
}

export function calculateSalary(totalMinutes: number, hourlyWage: number): number {
  return Math.round((totalMinutes / 60) * hourlyWage)
}

export function validatePin(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin)
}
