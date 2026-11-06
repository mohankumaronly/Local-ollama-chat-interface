import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock';

export function Markdown({ content }: { content: string }) {
  return (
    <div className="
      prose prose-base max-w-none wrap-break-word dark:prose-invert
      prose-headings:scroll-mt-24
      prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg
      prose-p:leading-7
      prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0
      prose-table:my-4 prose-table:text-sm
      prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:px-3 prose-th:py-1.5 prose-th:text-left dark:prose-th:border-gray-700 dark:prose-th:bg-gray-800
      prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-1.5 dark:prose-td:border-gray-700
      prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic dark:prose-blockquote:border-gray-600
      prose-hr:my-6
      prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5
      prose-a:no-underline hover:prose-a:underline
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = /language-/.test(className ?? '');
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-gray-200 px-1.5 py-0.5 text-[0.85em] font-mono dark:bg-gray-700"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}