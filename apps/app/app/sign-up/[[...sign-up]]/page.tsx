import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => (
  <div className="flex h-[calc(100dvh-61px)] w-screen items-center justify-center bg-sidebar p-8">
    <SignUp />
  </div>
);

export default SignUpPage;
