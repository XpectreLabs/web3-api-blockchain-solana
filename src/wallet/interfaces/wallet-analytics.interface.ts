/** Single token entry inside the portfolio breakdown. */
export interface PortfolioEntry {
  token: string;
  mint: string;
  balance: number;
  percentage: string;
}

/** Estimated gain/loss direction per SPL token. */
export interface GainLossEntry {
  mint: string;
  currentBalance: number;
  estimatedChange: 'gain' | 'flat' | 'loss';
  note: string;
}

/** 30-day trading volume summary. */
export interface Volume30Day {
  transactionCount: number;
  tradingFrequency: string;
  estimatedFeesSOL: number;
  periodDays: number;
}

/** Wallet age and engagement score. */
export interface WalletAgeInfo {
  firstSeenDate: string | null;
  walletAgeInDays: number | null;
  activityScore: number;
  activityLabel: 'High' | 'Medium' | 'Low';
}

/** Full analytics response shape for GET /wallet/:address/analytics */
export interface WalletAnalytics {
  address: string;
  solBalance: number;
  totalTokens: number;
  portfolioBreakdown: PortfolioEntry[];
  volume30Days: Volume30Day;
  gainsLosses: GainLossEntry[];
  walletAge: WalletAgeInfo;
}
