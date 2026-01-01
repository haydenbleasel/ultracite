import type { ReactNode } from "react";

interface LegalLayoutProps {
  children: ReactNode;
}

const LegalLayout = ({ children }: LegalLayoutProps) => (
  <div className="typography mx-auto">{children}</div>
);

export default LegalLayout;
