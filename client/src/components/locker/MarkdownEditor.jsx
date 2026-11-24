import { useRef, useState } from 'react';
import { Bold, Code, Heading2, Italic, List, ListChecks, Quote, Table } from 'lucide-react';
import { cx, inputClass } from '../ui/index.jsx';
import Markdown from './Markdown.jsx';

const tools = [
  { icon: Heading2, label: 'Heading', wrap: ['## ', ''], line: true },
  { icon: Bold, label: 'Bold', wrap: ['**', '**'] },
  { icon: Italic, label: 'Italic', wrap: ['_', '_'] },
  { icon: List, label: 'Bullet list', wrap: ['- ', ''], line: true },
  { icon: ListChecks, label: 'Checklist', wrap: ['- [ ] ', ''], line: true },
  { icon: Quote, label: 'Quote', wrap: ['> ', ''], line: true },
  { icon: Code, label: 'Code', wrap: ['`', '`'] },
  { icon: Table, label: 'Table', insert: '\n| Term | Meaning |\n| --- | --- |\n|  |  |\n' },
];

/** Markdown textarea with a small formatting toolbar and Write/Preview toggle. */
export default function MarkdownEditor({ value, onChange, rows = 14, placeholder }) {
  const [mode, setMode] = useState('write');
  const ref = useRef(null);

  const apply = (tool) => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    let next;
    let cursor;
    if (tool.insert) {
      next = value.slice(0, s) + tool.insert + value.slice(e);
      cursor = s + tool.insert.length;
    } else {
      const [pre, post] = tool.wrap;
      const start = tool.line ? value.lastIndexOf('\n', s - 1) + 1 : s;
      const selected = value.slice(start, e);
      next = value.slice(0, start) + pre + selected + post + value.slice(e);
      cursor = e + pre.length + post.length;
    }
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/60 px-2 py-1">
        <div className="flex overflow-x-auto">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              aria-label={t.label}
              disabled={mode === 'preview'}
              onClick={() => apply(t)}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 disabled:opacity-40"
            >
              <t.icon className="size-4" />
            </button>
          ))}
        </div>
        <div className="flex shrink-0 rounded-md bg-zinc-200/60 p-0.5 text-xs font-medium">
          {['write', 'preview'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cx('rounded px-2 py-1 capitalize', mode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500')}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {mode === 'write' ? (
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Note content (Markdown)"
          className={cx(inputClass, 'rounded-none border-0 py-3 font-mono text-[13px] leading-relaxed shadow-none focus:ring-0')}
        />
      ) : (
        <div className="min-h-[200px] px-4 py-3">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-zinc-400">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}
