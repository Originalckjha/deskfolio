import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from '../ui/index.jsx';

// react-markdown does not render raw HTML by default, so note content can't inject scripts.
const components = {
  // Wide tables scroll sideways on phones instead of stretching the page.
  table: ({ children, ...props }) => (
    <div className="-mx-1 overflow-x-auto px-1">
      <table {...props}>{children}</table>
    </div>
  ),
  a:({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};

export default function Markdown({ children, className }) {
  return (
    <div className={cx('prose prose-zinc max-w-none prose-headings:tracking-tight prose-a:text-indigo-600 prose-pre:bg-zinc-900', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}
