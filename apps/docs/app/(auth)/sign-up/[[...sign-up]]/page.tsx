import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Enter your details to get started.",
};

const SignUpPage = () => <SignUp />;

export default SignUpPage;
