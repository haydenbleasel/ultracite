import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Enter your details to sign in.",
};

const SignInPage = () => <SignIn />;

export default SignInPage;
