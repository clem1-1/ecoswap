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

// Arc Testnet tokens — all verified from https://docs.arc.io/arc/references/contract-addresses
export const FEATURED_TOKENS: Token[] = [
  {
    address: '0x3600000000000000000000000000000000000000',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    verified: true,
    color: '#2775CA',
    logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  },
  {
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    verified: true,
    color: '#1A56DB',
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20641.png',
  },
  {
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
    symbol: 'USYC',
    name: 'US Yield Coin',
    decimals: 6,
    verified: true,
    color: '#6B46C1',
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/25028.png',
  },
  {
    // Circle wrapped Bitcoin on Arc — 8 decimals matching BTC precision
    address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF',
    symbol: 'cirBTC',
    name: 'Circle Wrapped Bitcoin',
    decimals: 8,
    verified: true,
    color: '#F7931A',
    logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
  },
  {
    // Bridged WETH on Arc — lock ETH on Ethereum, mint on Arc
    address: '0x2c4047028a72803939b6fb674D01bC059B5C4961',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    verified: true,
    color: '#627EEA',
    logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  },
];

export function getTokenByAddress(address: string): Token | undefined {
  return FEATURED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase(),
  );
}

export const USDC_TOKEN = FEATURED_TOKENS[0];
