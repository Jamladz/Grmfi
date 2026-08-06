export interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  change24h: number;
  iconBg: string;
  iconUrl?: string;
  contractAddress: string;
  isVerified: boolean;
  isPopular?: boolean;
  category: 'popular' | 'defi' | 'meme' | 'stable';
  color: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletName: string | null;
  walletIcon?: string;
  balances: Record<string, number>; // token symbol -> amount
}

export interface SwapState {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  slippage: number; // e.g. 0.5%
  deadline: number; // in minutes
  isExpertMode: boolean;
}

export interface Pool {
  id: string;
  tokenA: Token;
  tokenB: Token;
  tvlUsd: number;
  apr: number;
  volume24hUsd: number;
  myLiquidityUsd?: number;
}

export type TransactionState = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

export interface TransactionRecord {
  id: string;
  hash: string;
  timestamp: number;
  type: 'swap' | 'add_liquidity';
  fromSymbol: string;
  fromAmount: string;
  toSymbol: string;
  toAmount: string;
  status: 'pending' | 'success' | 'failed';
}
