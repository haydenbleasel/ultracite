import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  a: ({ href, children, ...props }) => {
    if (!href) {
      return <span {...props}>{children}</span>;
    }

    const isExternal = /^https?:\/\//.test(href);
    if (isExternal) {
      return (
        <a href={href} rel="noopener" target="_blank" {...props}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  },
};

interface ReleaseMarkdownProps {
  children: string;
}

export const ReleaseMarkdown = ({ children }: ReleaseMarkdownProps) => (
  <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
    {children}
  </ReactMarkdown>
);
