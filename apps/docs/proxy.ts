import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { type NextRequest, NextResponse } from "next/server";

const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

const proxy = (request: NextRequest) => {
  // Handle Markdown preference rewrites for LLMs
  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
};

export const config = {
  // Matcher ignoring `/_next/`, `/api/`, static assets, favicon, file-based metadata, etc.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon\\.png|apple-icon\\.png|opengraph-image\\.png|twitter-image\\.png|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest).*)",
  ],
};

export default proxy;
