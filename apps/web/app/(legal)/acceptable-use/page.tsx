import { createPageMetadata } from "@/lib/site-metadata";

import Contents from "./contents.mdx";

export const metadata = createPageMetadata({
  description:
    "Review the rules for acceptable use of Ultracite's products, services, and related technologies under your agreement with us.",
  path: "/acceptable-use",
  title: "Acceptable Use Policy",
});

const AcceptableUsePolicyPage = () => <Contents />;

export default AcceptableUsePolicyPage;
