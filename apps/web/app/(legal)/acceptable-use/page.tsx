import { createPageMetadata } from "@/lib/site-metadata";

import Contents from "./contents.mdx";

export const metadata = createPageMetadata({
  description:
    'This acceptable use policy covers the products, services, and technologies (collectively referred to as the "Products") provided by Ultracite under any ongoing agreement.',
  path: "/acceptable-use",
  title: "Acceptable Use Policy",
});

const AcceptableUsePolicyPage = () => <Contents />;

export default AcceptableUsePolicyPage;
