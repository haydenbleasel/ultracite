// The && chain a nested ternary is sometimes rewritten into, and the 0 it can render.
export const Count = ({ count, loading }: { count: number; loading: boolean }) => (
  <div>
    {loading && <p>Loading…</p>}
    {!loading && count && <p>{count} items</p>}
    {!loading && !count && <p>Empty</p>}
  </div>
);
