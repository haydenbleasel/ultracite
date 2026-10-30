// C23: a TanStack-style file route: `Route` names the component, the component reads `Route`.
const createFileRoute = (_path: string) => (options: { component: () => unknown }) => ({
  ...options,
  useParams: () => ({ id: "1" }),
});

export const Route = createFileRoute("/posts/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <span>{id}</span>;
}
