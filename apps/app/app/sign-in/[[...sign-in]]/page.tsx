import { SignIn } from "@clerk/nextjs";

const SignInPage = () => (
  <div className="flex h-[calc(100dvh-61px)] w-screen items-center justify-center bg-sidebar p-8">
    <SignIn />
  </div>
);

export default SignInPage;
