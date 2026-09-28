export const BadComponent = ({ items }: { items: string[] }) => (
  <>
    <button>click</button>
    <ul>
      {items.map((item) => (
        <li>{item}</li>
      ))}
    </ul>
  </>
);
