import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Navbar } from "@/components/ultracite/navbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = async ({ children }: DashboardLayoutProps) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container relative mx-auto grid w-full gap-16 px-4 sm:gap-24 2xl:max-w-7xl">
      <Navbar />
      {children}
    </div>
  );
};

export default DashboardLayout;
