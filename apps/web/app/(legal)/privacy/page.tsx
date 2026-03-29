import { createPageMetadata } from "@/lib/site-metadata";

import Contents from "./contents.mdx";

export const metadata = createPageMetadata({
  description:
    "Your privacy is important to us. It is Ultracite's policy to respect your privacy and comply with any applicable law and regulation regarding any personal information we may collect about you, including across our website and other sites we own and operate.",
  path: "/privacy",
  title: "Privacy Policy",
});

const AcceptableUsePolicyPage = () => <Contents />;

export default AcceptableUsePolicyPage;
