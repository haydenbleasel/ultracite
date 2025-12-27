import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface PlatformLayoutProps {
  children: ReactNode;
}

const PlatformLayout = async ({ children }: PlatformLayoutProps) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <>{children}</>;
};

export default PlatformLayout;
