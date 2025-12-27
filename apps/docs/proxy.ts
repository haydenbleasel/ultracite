import { clerkMiddleware } from "@clerk/nextjs/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextResponse } from "next/server";

const { rewrite: rewriteLLM } = rewritePath(
  "/docs/*path",
  "/docs/llms.mdx/*path"
);

export default clerkMiddleware((_, request) => {
  // Handle Markdown preference rewrites for LLMs
  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals, all static files, and .well-known/workflow/*, unless found in search params
    "/((?!_next|\\.well-known/workflow/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
