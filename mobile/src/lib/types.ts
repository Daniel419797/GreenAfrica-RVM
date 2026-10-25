export type Profile = {
  uid: string; displayName: string; email: string; phoneNumber: string;
  greenId: string; referralCode: string;
};
export type Overview = {
  user: Profile; balance: number | null; balanceSource: 'algorand';
  balanceError: string | null; blockchainRegistered?: boolean; registrationMessage?: string | null;
};
export type Station = {
  id: string; name: string; address: string; lat: number; lng: number;
  active: boolean; statusVerified: boolean;
};
export type Activity = {
  id: string; type: 'earned' | 'redeemed' | 'referral'; description: string;
  amount: number; date: string | null; location: string | null;
};
