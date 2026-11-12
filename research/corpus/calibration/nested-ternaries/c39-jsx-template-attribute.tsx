// A nested ternary in a template literal in a className.
export const Row = ({ selected, disabled }: { selected: boolean; disabled: boolean }) => (
  <li className={`row ${selected ? "row-selected" : disabled ? "row-disabled" : ""}`}>item</li>
);
