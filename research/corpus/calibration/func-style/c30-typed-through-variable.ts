// C30: a framework-style handler typed through its variable, and the declaration that spells the
// same types out.
type Context = { path: string };
type Middleware = (c: Context, next: () => Promise<void>) => Promise<void>;

export const logger: Middleware = async (c, next) => {
  void c.path;
  await next();
};

export async function loggerDeclared(c: Context, next: () => Promise<void>): Promise<void> {
  void c.path;
  await next();
}
