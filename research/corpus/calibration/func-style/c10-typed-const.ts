// C10: a const arrow typed through its variable, and with `satisfies`.
type Handler = (input: string) => number;

export const handler: Handler = (input) => input.length;

export const other = ((input) => input.length * 2) satisfies Handler;
