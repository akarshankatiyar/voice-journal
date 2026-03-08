import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showToc?: boolean;
}

function generateId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractHeadings(content: string) {
  const matches = content.match(/^## .+$/gm);
  if (!matches) return [];
  return matches.map(h => h.replace(/^## /, ''));
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Detect callout patterns
function CalloutWrapper({ children, node }: any) {
  const text = React.Children.toArray(children)
    .map((child: any) => (typeof child === 'string' ? child : child?.props?.children || ''))
    .join('');

  if (typeof text === 'string') {
    if (text.startsWith('Definition:')) {
      return (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-vc-blue bg-vc-blue/5 p-4 my-3">
          <span className="text-lg shrink-0">📘</span>
          <p className="text-sm font-body text-foreground/90">{children}</p>
        </div>
      );
    }
    if (text.startsWith('Important:') || text.startsWith('Note:')) {
      return (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-gold bg-gold/5 p-4 my-3">
          <span className="text-lg shrink-0">⚠️</span>
          <p className="text-sm font-body text-foreground/90">{children}</p>
        </div>
      );
    }
    if (text.startsWith('Key Takeaway:') || text.startsWith('Summary:')) {
      return (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-500/5 p-4 my-3">
          <span className="text-lg shrink-0">✅</span>
          <p className="text-sm font-body text-foreground/90" style={{ fontFamily: "'Dancing Script', cursive" }}>{children}</p>
        </div>
      );
    }
    if (text.startsWith('Formula:')) {
      return (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-gold bg-card p-4 my-3">
          <span className="text-lg shrink-0">🔢</span>
          <p className="text-sm font-mono text-foreground/90">{children}</p>
        </div>
      );
    }
  }

  return <p className="text-sm font-body text-foreground/85 leading-relaxed my-2">{children}</p>;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 id={generateId(String(children))} className="font-display text-[28px] text-primary border-b-2 border-gold pb-2 mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 id={generateId(String(children))} className="font-display text-[22px] text-vc-blue border-l-4 border-vc-blue pl-3 mt-6 mb-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-body text-lg font-bold text-secondary mt-5 mb-2">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-body text-base font-semibold text-foreground mt-4 mb-2">{children}</h4>
  ),
  p: CalloutWrapper,
  strong: ({ children }) => (
    <strong className="text-gold font-bold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-muted-foreground text-base" style={{ fontFamily: "'Dancing Script', cursive" }}>{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gold bg-gold/5 rounded-r-lg px-4 py-3 my-3 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="space-y-1.5 my-3 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-1.5 my-3 pl-1 list-none counter-reset-list">{children}</ol>
  ),
  li: ({ children, node }) => {
    const isOrdered = node?.position?.start && false; // we style both the same way
    return (
      <li className="flex items-start gap-2 text-sm font-body text-foreground/85 leading-relaxed">
        <span className="mt-1.5 h-2 w-2 rounded-full bg-vc-blue/60 shrink-0" />
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className={`block text-sm ${className}`}>{children}</code>
      );
    }
    return (
      <code className="bg-vc-blue/10 text-destructive rounded px-1.5 py-0.5 text-xs font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-card rounded-xl p-4 my-3 overflow-x-auto text-sm border border-primary/10">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-primary/10">
      <table className="w-full text-sm font-body border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-vc-blue text-primary-foreground">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider">{children}</th>
  ),
  tbody: ({ children }) => (
    <tbody className="[&>tr:nth-child(even)]:bg-primary/5">{children}</tbody>
  ),
  td: ({ children }) => (
    <td className="px-3.5 py-2.5 text-foreground/80 border-t border-primary/5">{children}</td>
  ),
  hr: () => (
    <hr className="border-none h-0.5 bg-gradient-to-r from-gold to-vc-blue my-6 rounded-full" />
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-vc-blue hover:underline transition-colors">
      {children}
    </a>
  ),
};

export function MarkdownRenderer({ content, className = '', showToc = true }: MarkdownRendererProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const shouldShowToc = showToc && wordCount(content) > 400 && headings.length > 1;

  return (
    <div className={`markdown-rendered ${className}`}>
      {shouldShowToc && (
        <div className="glass-card p-4 mb-5">
          <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            📋 In this note
          </p>
          <ul className="space-y-1">
            {headings.map(h => (
              <li key={h}>
                <a
                  href={`#${generateId(h)}`}
                  className="text-sm font-body text-vc-blue hover:text-primary hover:underline transition-colors"
                >
                  {h}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
