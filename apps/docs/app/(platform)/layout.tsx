import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = async ({ children }: DashboardLayoutProps) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container relative mx-auto mt-8 grid w-full gap-8 px-4 sm:mt-16 2xl:max-w-7xl">
      {children}
    </div>
  );
};

export default DashboardLayout;
