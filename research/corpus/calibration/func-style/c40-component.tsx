// C40: React components as a declaration, a const arrow and a memo-wrapped arrow.
const memo = <T,>(c: T): T => c;

export function Card({ title }: { title: string }) {
  return <h2>{title}</h2>;
}

export const Badge = ({ label }: { label: string }) => <span>{label}</span>;

export const Memoized = memo(({ id }: { id: number }) => <i>{id}</i>);
