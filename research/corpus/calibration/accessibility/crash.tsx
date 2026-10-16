// A component with a `role` prop whose value is an object, as in Supabase Studio's
// JitDbAccessRuleSheet.tsx L316 (a database role, not an ARIA role). eslint-plugin-jsx-a11y 6.10.2's
// prefer-tag-over-role throws "propValue.lastIndexOf is not a function" on it, which aborts the
// whole ESLint run (jsx-eslint/eslint-plugin-jsx-a11y#1102). Kept apart from cases.tsx so the other
// cases still lint.
import type { ReactNode } from "react";

declare function RoleGrantFields(p: { role: { id: string; label: string } }): ReactNode;

// X01: a custom component with role={{ … }}
export const X01 = () => <RoleGrantFields role={{ id: "admin", label: "Admin" }} />;
// END
