// Calibration cases for the length rules on JSX (length-calibration.cjs). Each case is one
// top-level declaration named after its id. Nothing here is run.

declare const forwardRef: <T>(render: (props: T, ref: unknown) => unknown) => unknown;
declare const items: string[];

// J01: a function component that returns JSX (SonarJS exempts it from max-lines-per-function)
export function J01() {
  const title = "Title";
  return (
    <section>
      <h1>{title}</h1>
      <p>One</p>
      <p>Two</p>
    </section>
  );
}

// J02: an arrow component with an expression body (no `return`, so SonarJS doesn't exempt it)
export const J02 = () => (
  <section>
    <h1>Title</h1>
    <p>One</p>
    <p>Two</p>
  </section>
);

// J03: a component wrapped in forwardRef (the arrow has no name of its own)
export const J03 = forwardRef((props: { label: string }, ref) => {
  const label = props.label;
  return (
    <button ref={ref as never} type="button">
      {label}
    </button>
  );
});

// J04: a lowercase helper that returns JSX
export function j04() {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// J05: a component whose markup is most of its length (60 physical lines)
export function J05({ open }: { open: boolean }) {
  const label = open ? "Close" : "Open";
  return (
    <div className="panel">
      <header className="panel-header">
        <h2 className="panel-title">Settings</h2>
        <button className="panel-toggle" type="button">
          {label}
        </button>
      </header>
      <form className="panel-form">
        <label className="field">
          <span className="field-label">Name</span>
          <input className="field-input" name="name" type="text" />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input className="field-input" name="email" type="email" />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="field-input" name="password" type="password" />
        </label>
        <label className="field">
          <span className="field-label">Team</span>
          <select className="field-input" name="team">
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
          </select>
        </label>
        <fieldset className="field">
          <legend className="field-label">Role</legend>
          <label>
            <input name="role" type="radio" value="admin" />
            Admin
          </label>
          <label>
            <input name="role" type="radio" value="member" />
            Member
          </label>
        </fieldset>
        <footer className="panel-footer">
          <button className="button" type="reset">
            Reset
          </button>
          <button className="button button-primary" type="submit">
            Save
          </button>
        </footer>
      </form>
    </div>
  );
}
