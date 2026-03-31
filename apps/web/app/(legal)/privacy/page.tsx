import { createPageMetadata } from "@/lib/site-metadata";

import Contents from "./contents.mdx";

export const metadata = createPageMetadata({
  description:
    "Read how Ultracite collects, uses, and protects personal information across the website and any related services you use.",
  path: "/privacy",
  title: "Privacy Policy",
});

const AcceptableUsePolicyPage = () => <Contents />;

export default AcceptableUsePolicyPage;
