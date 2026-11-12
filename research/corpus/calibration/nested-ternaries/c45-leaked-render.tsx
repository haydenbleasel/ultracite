// react/jsx-no-leaked-render's fix turns `&&` into a ternary; in a ternary's branch, or around one, the result is nested.
export const Inbox = ({ loading, count }: { loading: boolean; count: number }) => (
  <div>{loading ? <p>Loading…</p> : count && <p>{count} new</p>}</div>
);
export const Badge = ({ count, urgent }: { count: number; urgent: boolean }) => (
  <span>{count && (urgent ? <b>{count}</b> : <i>{count}</i>)}</span>
);
export const Plain = ({ count }: { count: number }) => <span>{count && <i>{count}</i>}</span>;
