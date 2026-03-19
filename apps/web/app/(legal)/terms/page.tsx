"use cache";

import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import Contents from "./contents.mdx";

export const metadata: Metadata = {
  description:
    "These Terms of Service govern your use of the website located at Ultracite and any related services provided by Ultracite.",
  title: "Terms of Service",
};

const AcceptableUsePolicyPage = async () => {
  cacheLife("max");
  return <Contents />;
};

export default AcceptableUsePolicyPage;
