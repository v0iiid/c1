export function computeStatus(launch: any): string {
  const now = new Date();
  const totalPurchased = launch.purchases?.reduce((sum: number, p: any) => sum + p.amount, 0) ?? 0;
  if (totalPurchased >= launch.totalSupply) return 'SOLD_OUT';
  if (now < new Date(launch.startsAt)) return 'UPCOMING';
  if (now > new Date(launch.endsAt)) return 'ENDED';
  return 'ACTIVE';
}