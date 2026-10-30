// C44: a component declaration referenced while the module loads, above its line (as a route
// table or a default export wrapped in a call does).
const wrap = <T,>(component: T): { component: T } => ({ component });

export const routes = [wrap(Home)];

function Home() {
  return <main>home</main>;
}
