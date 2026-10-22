// Zod's `.catch()` is a parse fallback, not a promise handler (#854).
declare const z: {
  string: () => { optional: () => { catch: (value: undefined) => unknown } };
};

export const optionalName = () => z.string().optional().catch(undefined);
