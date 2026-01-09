import type { Metadata } from "next";

import Contents from "./contents.mdx";

export const metadata: Metadata = {
  description:
    'This acceptable use policy covers the products, services, and technologies (collectively referred to as the "Products") provided by Ultracite under any ongoing agreement.',
  title: "Acceptable Use Policy",
};

const AcceptableUsePolicyPage = () => <Contents />;

export default AcceptableUsePolicyPage;
