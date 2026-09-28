import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="tooltip-wrap cursor-help">
      {children ?? <HelpCircle size={13} style={{ color: 'var(--muted)' }} />}
      <span className="tooltip-text">{text}</span>
    </span>
  );
}
