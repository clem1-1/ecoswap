import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

const FAQS = [
  {
    q: 'What is EcoSwap?',
    a: 'EcoSwap is a permissionless decentralized exchange (DEX) running on the Arc Testnet. It uses an automated market maker (AMM) model — anyone can swap tokens or provide liquidity to earn fees, with no order book or centralised party.',
  },
  {
    q: 'Is this using real money?',
    a: 'No. EcoSwap runs on Arc Testnet only. All tokens are free testnet tokens with no real-world value. You cannot lose real funds.',
  },
  {
    q: 'How do I get testnet tokens?',
    a: 'Go to the Faucet tab and click "Claim Testnet Tokens". This opens the Circle Faucet at faucet.circle.com where you can request free USDC and EURC for Arc Testnet.',
  },
  {
    q: 'How do I make a swap?',
    a: '1. Connect your wallet. 2. Go to the Swap tab. 3. Select the tokens you want to swap. 4. Enter an amount. 5. Review the quote, price impact, and fees. 6. If it\'s your first time swapping that token, you\'ll need to Approve it first. 7. Click Swap and confirm in your wallet.',
  },
  {
    q: 'What is price impact?',
    a: 'Price impact is how much your trade moves the pool price. Large trades relative to pool size have higher price impact. A high price impact means you\'re getting a worse rate — try a smaller amount or wait for more liquidity.',
  },
  {
    q: 'What is slippage tolerance?',
    a: 'Slippage tolerance is the maximum price change you\'ll accept between submitting and confirming your transaction. If the price moves more than your tolerance, the transaction reverts. A higher tolerance means fewer reverts but potentially worse prices.',
  },
  {
    q: 'What are LP tokens?',
    a: 'LP (Liquidity Provider) tokens represent your share of a pool. When you add liquidity, you receive LP tokens. When you remove liquidity, you burn LP tokens to get back your underlying tokens plus any fees earned.',
  },
  {
    q: 'How do I add liquidity?',
    a: '1. Go to the Liquidity tab. 2. Select a pool (or go to Create to make a new one). 3. Enter the amounts of both tokens. 4. Approve both tokens. 5. Confirm the deposit. You\'ll receive LP tokens representing your share.',
  },
  {
    q: 'Why does EcoSwap use USDC for gas?',
    a: 'EcoSwap runs on Arc, a blockchain where USDC is the native gas token. This means you pay transaction fees in USDC instead of ETH, keeping everything in one stablecoin and making costs predictable.',
  },
  {
    q: 'What is Arc Testnet?',
    a: 'Arc is Circle\'s blockchain where USDC is the native gas token. Arc Testnet (chain ID 5042002) is the test network for development. It has sub-second finality and predictable USDC gas costs.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left hover:opacity-80 transition-opacity"
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{q}</span>
        {open ? <ChevronUp size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
      </button>
      {open && (
        <p className="text-sm pb-4 leading-relaxed" style={{ color: 'var(--muted)' }}>{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen size={18} style={{ color: 'var(--accent)' }} />
        <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>FAQ & Docs</h2>
      </div>

      <div className="rounded-2xl px-4 py-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        {FAQS.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
      </div>

      <div className="rounded-2xl px-4 py-4 space-y-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Resources</p>
        {[
          { label: 'Arc Testnet Docs', url: 'https://docs.arc.io' },
          { label: 'Circle Faucet', url: 'https://faucet.circle.com' },
          { label: 'Arc Testnet Explorer', url: 'https://explorer.testnet.arc.io' },
          { label: 'USDC on Arc', url: 'https://developers.circle.com/stablecoins/usdc-contract-addresses' },
        ].map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-2 text-sm hover:opacity-70 transition-opacity"
            style={{ color: 'var(--ink-2)' }}
          >
            {link.label}
            <span style={{ color: 'var(--accent-teal)' }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}
