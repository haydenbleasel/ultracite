// Markdown imported with `with { type: "text" }`, which Bun inlines into the
// bundle as a string.
declare module "*.md" {
  const content: string;
  export default content;
}
