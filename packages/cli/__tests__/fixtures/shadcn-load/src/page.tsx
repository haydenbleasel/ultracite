import { Button } from "./components/ui/button";

// Deliberately violates the shadcn rules so the load test can assert the
// plugin's diagnostics actually fire (not just that it loads).
export function Page({ tone }: { tone: string }) {
  return (
    <main className="flex-cols mt-4">
      <Button className="mt-4 w-full">Allowed: layout only</Button>
      <Button className="rounded-full p-4">Restyled</Button>
      <Button className="bg-pink-500">Raw color</Button>
      <Button className={`bg-${tone}`}>Dynamic</Button>
      <div className="bg-[#333] p-[13px]">Arbitrary</div>
      <div style={{ color: "red" }}>Inline</div>
    </main>
  );
}
