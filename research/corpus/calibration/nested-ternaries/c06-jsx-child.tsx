// A nested ternary as a JSX child: conditional rendering with a loading and an empty state.
export const Results = ({ loading, items }: { loading: boolean; items: string[] }) => (
  <div>
    {loading ? <p>Loading…</p> : items.length === 0 ? <p>No results</p> : <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>}
  </div>
);
