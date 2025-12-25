import type { Provider } from "@ultracite/data/providers";

interface FeaturesProps {
  provider: Provider;
}

export const Features = ({ provider }: FeaturesProps) => (
  <section className="grid gap-8">
    <div className="grid gap-4">
      <h2 className="font-semibold text-2xl tracking-tight">
        Why {provider.name.split(" ")[0]}?
      </h2>
      <p className="max-w-2xl text-muted-foreground">{provider.whyContent}</p>
    </div>

    <div
      className={`grid gap-4 ${provider.features.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
    >
      {provider.features.map((feature) => (
        <div className="rounded-lg border p-6" key={feature.title}>
          <h3 className="mb-2 font-medium">{feature.title}</h3>
          <p className="text-muted-foreground text-sm">{feature.description}</p>
        </div>
      ))}
    </div>
  </section>
);
