import { Card } from '../../components/ui/index.jsx';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-md pt-4 sm:pt-10">
      <div className="mb-6 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto mb-4 size-10" />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      <Card className="p-6">{children}</Card>
      {footer && <p className="mt-4 text-center text-sm text-zinc-500">{footer}</p>}
    </div>
  );
}
