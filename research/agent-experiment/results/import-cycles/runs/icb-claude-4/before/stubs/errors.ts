// STUB, not part of the original source: Astro's AstroError (packages/astro/src/core/errors/errors.ts)
// and the one entry of AstroErrorData (errors-data.ts, ResponseSentError) that cookies.ts uses.
export class AstroError extends Error {
  title: string | undefined;

  constructor(props: { name: string; title?: string; message?: string }) {
    super(props.message);
    this.name = props.name;
    this.title = props.title;
  }
}

export const AstroErrorData = {
  ResponseSentError: {
    message: "The response has already been sent to the browser and cannot be altered.",
    name: "ResponseSentError",
    title: "Unable to set response.",
  },
};
