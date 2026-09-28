export const BadComponent = ({ items }: { items: string[] }) => (
  <ul>
    {items.map((item) => (
      <li>{item}</li>
    ))}
  </ul>
);
