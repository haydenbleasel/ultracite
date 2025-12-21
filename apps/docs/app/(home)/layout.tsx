import { Navbar } from "@/components/ultracite/navbar";
import type { ReactNode } from "react";

type HomeLayoutProps = {
  children: ReactNode;
};

const HomeLayout = ({ children }: HomeLayoutProps) => (
  <div className="relative mx-auto grid w-full container 2xl:max-w-7xl gap-24 px-4 sm:gap-32">
    <Navbar />
    {children}
  </div>
);

export default HomeLayout;
