import { createPageMetadata } from "@/lib/site-metadata";
import Contents from "./contents.mdx";

export const metadata = createPageMetadata({
  description:
    "These Terms of Service govern your use of the website located at Ultracite and any related services provided by Ultracite.",
  path: "/terms",
  title: "Terms of Service",
});

const AcceptableUsePolicyPage = () => <Contents />;

export default AcceptableUsePolicyPage;
