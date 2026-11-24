import { useState } from 'react';
import { Star } from 'lucide-react';
import { cx } from './index.jsx';

/** Read-only stars with fractional fill, e.g. 4.3. */
export function Stars({ value = 0, size = 16, className, showValue = false }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (cls) => (
    <div className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={cls} strokeWidth={1.5} />
      ))}
    </div>
  );
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-block" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
        {row('fill-zinc-200 text-zinc-200')}
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
          {row('fill-amber-400 text-amber-400')}
        </span>
      </span>
      {showValue && <span className="text-sm font-medium text-zinc-700">{value.toFixed(1)}</span>}
    </span>
  );
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** Clickable 1-5 rating input. */
export function StarInput({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Rating" className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              style={{ width: size, height: size }}
              strokeWidth={1.5}
              className={n <= shown ? 'fill-amber-400 text-amber-400' : 'fill-zinc-100 text-zinc-300'}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-zinc-500">{LABELS[shown]}</span>
    </div>
  );
}
