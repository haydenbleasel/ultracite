import type { Metadata } from "next";

import { LoginForm } from "@/components/supabase-ui/login-form";

export const metadata: Metadata = {
  description: "Enter your details to sign in.",
  title: "Sign in",
};

const SignInPage = () => <LoginForm />;

export default SignInPage;
