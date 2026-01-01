import type { Metadata } from "next";
import Contents from "./contents.mdx";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description:
    'This acceptable use policy covers the products, services, and technologies (collectively referred to as the "Products") provided by Ultracite under any ongoing agreement.',
};

const AcceptableUsePolicyPage = () => <Contents />;

export default AcceptableUsePolicyPage;
