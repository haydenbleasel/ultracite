// B03, by hand: the filtered list is derived from the prop during render; no effect, no state.
export const Subject = ({ items }: { items: string[] }) => {
  const visible = items.filter((i) => i.length > 0);
  return <p>{visible.join(",")}</p>;
};
