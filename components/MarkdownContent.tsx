'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="prose prose-invert prose-zinc max-w-none prose-pre:bg-zinc-900 prose-code:text-zinc-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
