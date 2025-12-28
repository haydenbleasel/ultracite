import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

interface PlatformLayoutProps {
  children: ReactNode;
}

const PlatformLayout = async ({ children }: PlatformLayoutProps) => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/sign-in");
  }

  return children;
};

export default PlatformLayout;
