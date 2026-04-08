export async function checkFraud(_revieweeId: string, _rating: number, _reviewerIp: string): Promise<{ isFlagged: boolean; riskScore: number }> {
  return { isFlagged: false, riskScore: 0 };
}
export async function getFraudStats(): Promise<object> { return {}; }
