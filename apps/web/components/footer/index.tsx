"use client";

import { Navigation } from "./navigation";
import { SubFooter } from "./sub-footer";

export const Footer = () => {
  return (
    <div className="mt-24 mb-12 grid gap-8">
      <Navigation />
      <SubFooter />
    </div>
  );
};
