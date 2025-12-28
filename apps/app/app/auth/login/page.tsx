import type { Metadata } from "next";
import { LoginForm } from "@/components/supabase-ui/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Enter your details to sign in.",
};

const SignInPage = () => <LoginForm />;

export default SignInPage;
