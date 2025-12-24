import type { ReactNode } from "react";
import { Navbar } from "@/components/ultracite/navbar";

interface HomeLayoutProps {
  children: ReactNode;
}

const HomeLayout = ({ children }: HomeLayoutProps) => (
  <div className="container relative mx-auto grid w-full space-y-16 px-4 sm:space-y-24 2xl:max-w-7xl">
    <Navbar />
    {children}
  </div>
);

export default HomeLayout;
