'use client';
import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { marked } from 'marked';

export default function KaTeXRenderer({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let html = marked(content) as string;
    html = html.replace(/\$\$(.+?)\$\$/gs, (_, math) => {
      try { return katex.renderToString(math, { displayMode: true, throwOnError: false }); }
      catch { return math; }
    });
    html = html.replace(/\$(.+?)\$/g, (_, math) => {
      try { return katex.renderToString(math, { displayMode: false, throwOnError: false }); }
      catch { return math; }
    });
    ref.current.innerHTML = html;
  }, [content]);
  return <div ref={ref} />;
}