interface JsonLdProps {
  data: Record<string, unknown>;
}

const serializeJsonLd = (data: Record<string, unknown>) =>
  JSON.stringify(data).replaceAll("<", "\\u003c");

export const JsonLd = ({ data }: JsonLdProps) => (
  <script type="application/ld+json">{serializeJsonLd(data)}</script>
);
