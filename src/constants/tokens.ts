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
    // Official USDC logo from Circle's CDN
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  },
  {
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    verified: true,
    color: '#1A56DB',
    // Official EURC logo from Circle's CDN
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c/logo.png',
  },
  {
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
    symbol: 'USYC',
    name: 'US Yield Coin',
    decimals: 6,
    verified: true,
    color: '#6B46C1',
    // Hashnote USYC logo
    logoURI: 'https://assets.coingecko.com/coins/images/33413/small/usyc.png',
  },
];

export function getTokenByAddress(address: string): Token | undefined {
  return FEATURED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase(),
  );
}

export const USDC_TOKEN = FEATURED_TOKENS[0];
