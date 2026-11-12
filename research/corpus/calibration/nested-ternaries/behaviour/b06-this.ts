// A lookup of method references loses `this`.
export const calls: string[] = [];
class Handler {
  name = "handler";
  onOpen(): string {
    calls.push("onOpen");
    return `${this.name} opened`;
  }
  onClose(): string {
    calls.push("onClose");
    return `${this.name} closed`;
  }
  original(kind: string): string {
    return kind === "open" ? this.onOpen() : kind === "close" ? this.onClose() : "ignored";
  }
  lookup(kind: string): string {
    const fn = ({ close: this.onClose, open: this.onOpen } as Record<string, () => string>)[kind];
    return fn ? fn() : "ignored";
  }
  lookupBound(kind: string): string {
    const fn = ({ close: () => this.onClose(), open: () => this.onOpen() } as Record<string, () => string>)[kind];
    return fn ? fn() : "ignored";
  }
}
const h = new Handler();
export const inputs = ["open", "close", "other"];
export const original = (k: string): string => h.original(k);
export const rewrites = {
  lookup: (k: string): string => h.lookup(k),
  lookupBound: (k: string): string => h.lookupBound(k),
};
