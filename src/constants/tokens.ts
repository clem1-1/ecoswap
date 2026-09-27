// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002;

// Featured / curated tokens on Arc Testnet
// Addresses verified from https://docs.arc.io/arc/references/contract-addresses
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  verified: boolean; // false for custom user-pasted tokens
  color?: string;    // brand color for the avatar (defaults to #6B6580)
}

// Arc Testnet native assets (Circle-issued)
// Source: https://docs.arc.io/arc/references/contract-addresses
export const FEATURED_TOKENS: Token[] = [
  {
    address: '0x3600000000000000000000000000000000000000',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    verified: true,
    color: '#2775CA',
  },
  {
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    verified: true,
    color: '#1A56DB',
  },
  {
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
    symbol: 'USYC',
    name: 'US Yield Coin',
    decimals: 6,
    verified: true,
    color: '#6B46C1',
  },
];

export function getTokenByAddress(address: string): Token | undefined {
  return FEATURED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase(),
  );
}

export const USDC_TOKEN = FEATURED_TOKENS[0];
