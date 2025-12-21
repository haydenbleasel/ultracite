import type { ReactNode } from "react";

type HomeLayoutProps = {
  children: ReactNode;
};

const HomeLayout = ({ children }: HomeLayoutProps) => (
  <div className="relative mx-auto grid w-full max-w-(--fd-layout-width) gap-24 px-4 sm:gap-32">
    {children}
  </div>
);

export default HomeLayout;
