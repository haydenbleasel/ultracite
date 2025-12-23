import type { ReactNode } from 'react';

type AuthLayoutProps = {
  readonly children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex h-screen w-screen items-center justify-center bg-sidebar p-8">
    <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6">
      {children}
    </div>
  </div>
);

export default AuthLayout;
