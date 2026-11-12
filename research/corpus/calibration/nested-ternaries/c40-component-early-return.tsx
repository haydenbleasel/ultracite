// c06 rewritten with early returns: the component returns per state.
export const Results = ({ loading, items }: { loading: boolean; items: string[] }) => {
  if (loading) {
    return (
      <div>
        <p>Loading…</p>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div>
        <p>No results</p>
      </div>
    );
  }
  return (
    <div>
      <ul>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
};
