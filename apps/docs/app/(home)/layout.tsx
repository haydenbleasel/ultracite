import type { ReactNode } from "react";

interface HomeLayoutProps {
  children: ReactNode;
}

const HomeLayout = ({ children }: HomeLayoutProps) => (
  <div className="container relative mx-auto mt-16 grid px-4 sm:mt-24 2xl:max-w-7xl">
    {children}
  </div>
);

export default HomeLayout;
