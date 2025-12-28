import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";

interface PlatformLayoutProps {
  children: ReactNode;
}

const PlatformLayout = async ({ children }: PlatformLayoutProps) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return children;
};

export default PlatformLayout;
