import { Token, Pool } from '../types';

export const TOKENS: Token[] = [
  {
    id: 'grmf',
    symbol: 'GRMF',
    name: 'GRMF Token',
    decimals: 9,
    priceUsd: 0.0012,
    change24h: 12.45,
    iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-600',
    iconUrl: 'https://i.suar.me/JpxXB/l',
    contractAddress: 'EQC324G...grmf_token_mainnet',
    isVerified: true,
    isPopular: true,
    category: 'popular',
    color: '#00F5D4'
  },
  {
    id: 'gram',
    symbol: 'GRAM',
    name: 'Gram Token',
    decimals: 9,
    priceUsd: 5.12,
    change24h: 3.28,
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    iconUrl: 'https://i.suar.me/zXrj0/l',
    contractAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    isVerified: true,
    isPopular: true,
    category: 'popular',
    color: '#0098EA'
  },
  {
    id: 'not',
    symbol: 'NOT',
    name: 'Notcoin',
    decimals: 9,
    priceUsd: 0.0084,
    change24h: -2.15,
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-600',
    iconUrl: 'https://i.suar.me/ZzX70/l',
    contractAddress: 'EQA2kAd2...notcoin_master',
    isVerified: true,
    isPopular: true,
    category: 'meme',
    color: '#F59E0B'
  },
  {
    id: 'dogs',
    symbol: 'DOGS',
    name: 'DOGS Token',
    decimals: 9,
    priceUsd: 0.00064,
    change24h: 8.92,
    iconBg: 'bg-gradient-to-br from-slate-200 to-slate-400',
    iconUrl: 'https://i.suar.me/0poZZ/l',
    contractAddress: 'EQC2kAd3...dogs_token_master',
    isVerified: true,
    isPopular: true,
    category: 'meme',
    color: '#E2E8F0'
  },
  {
    id: 'hmstr',
    symbol: 'HMSTR',
    name: 'Hamster Kombat',
    decimals: 9,
    priceUsd: 0.0028,
    change24h: -4.30,
    iconBg: 'bg-gradient-to-br from-orange-400 to-red-500',
    iconUrl: 'https://i.suar.me/4z5Oo/l',
    contractAddress: 'EQB3kAd4...hmstr_master',
    isVerified: true,
    isPopular: true,
    category: 'meme',
    color: '#F97316'
  },
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    priceUsd: 1.00,
    change24h: 0.01,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    iconUrl: 'https://i.suar.me/5PgrM/l',
    contractAddress: 'EQCxE6mUt_TX2-3093358-1-USDT_TON_Master',
    isVerified: true,
    isPopular: true,
    category: 'stable',
    color: '#26A17B'
  }
];

export const POOLS: Pool[] = [
  {
    id: 'grmf-gram',
    tokenA: TOKENS[0], // GRMF
    tokenB: TOKENS[1], // GRAM
    tvlUsd: 4850000,
    apr: 112.4,
    volume24hUsd: 1420000
  },
  {
    id: 'usdt-gram',
    tokenA: TOKENS[5], // USDT
    tokenB: TOKENS[1], // GRAM
    tvlUsd: 12500000,
    apr: 12.5,
    volume24hUsd: 2800000
  },
  {
    id: 'not-gram',
    tokenA: TOKENS[2], // NOT
    tokenB: TOKENS[1], // GRAM
    tvlUsd: 3100000,
    apr: 45.6,
    volume24hUsd: 940000
  },
  {
    id: 'dogs-gram',
    tokenA: TOKENS[3], // DOGS
    tokenB: TOKENS[1], // GRAM
    tvlUsd: 1250000,
    apr: 62.1,
    volume24hUsd: 310000
  },
  {
    id: 'hmstr-gram',
    tokenA: TOKENS[4], // HMSTR
    tokenB: TOKENS[1], // GRAM
    tvlUsd: 850000,
    apr: 184.5,
    volume24hUsd: 520000
  }
];
