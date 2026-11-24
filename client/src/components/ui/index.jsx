import { useEffect, useId, useState } from 'react';
import { Check, Copy, LoaderCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyText } from '../../utils/format.js';

export const cx = (...c) => c.filter(Boolean).join(' ');

// ---------- Button ----------
const variants = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-700',
  secondary: 'border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  dark: 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800',
};
const sizes = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export function Button({ as: As = 'button', variant = 'primary', size = 'md', loading, className, children, ...props }) {
  const isButton = As === 'button';
  return (
    <As
      {...(isButton && { type: 'button', disabled: props.disabled || loading })}
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </As>
  );
}

// ---------- Form fields ----------
export const inputClass =
  'block w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-zinc-50';

export function Field({ label, hint, error, children, className }) {
  const id = useId();
  const child = typeof children === 'function' ? children(id) : children;
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      {child}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

export const Input = ({ className, ...p }) => <input {...p} className={cx(inputClass, 'h-10', className)} />;
export const Textarea = ({ className, ...p }) => (
  <textarea {...p} className={cx(inputClass, 'py-2 leading-relaxed', className)} />
);
export const Select = ({ className, children, ...p }) => (
  <select {...p} className={cx(inputClass, 'h-10 pr-8', className)}>
    {children}
  </select>
);

// ---------- Surfaces ----------
export const Card = ({ className, children, ...p }) => (
  <div {...p} className={cx('rounded-xl border border-zinc-200/80 bg-white shadow-sm', className)}>
    {children}
  </div>
);

const tones = {
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
};
export const Badge = ({ tone = 'zinc', className, children }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      tones[tone],
      className,
    )}
  >
    {children}
  </span>
);

export const Spinner = ({ className }) => (
  <LoaderCircle className={cx('animate-spin text-zinc-400', className ?? 'size-5')} aria-label="Loading" />
);

export const PageSpinner = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Spinner className="size-6" />
  </div>
);

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cx('flex flex-col items-center rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center', className)}>
      {Icon && (
        <div className="mb-3 rounded-full bg-zinc-100 p-3 text-zinc-500">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <h3 className="font-medium text-zinc-900">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-zinc-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const message = error?.response?.data?.message || error?.message || 'Something went wrong';
  return (
    <EmptyState
      title="Couldn't load this"
      action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    >
      {message}
    </EmptyState>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Avatar ----------
const avatarColors = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];
export function Avatar({ name = '', src, size = 'md', className }) {
  const dims = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl', xl: 'size-20 text-2xl' }[size];
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const color = avatarColors[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % avatarColors.length];
  if (src) return <img src={src} alt="" className={cx('rounded-full object-cover', dims, className)} />;
  return (
    <span aria-hidden className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', dims, color, className)}>
      {initials || '?'}
    </span>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-zinc-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="-m-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Tabs ----------
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cx('flex gap-1 border-b border-zinc-200', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            value === t.value
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800',
          )}
        >
          {t.icon && <t.icon className="size-4" aria-hidden />}
          {t.label}
          {t.count != null && <span className="rounded-full bg-zinc-100 px-1.5 text-xs text-zinc-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Copy button ----------
export function CopyButton({ text, label = 'Copy', className, size = 'sm' }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size={size}
      className={className}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          toast.success('Copied');
          setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}
