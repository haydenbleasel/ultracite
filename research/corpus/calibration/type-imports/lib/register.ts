// A module whose importers rely on its side effect: it registers a global.
(globalThis.__evaluated ??= []).push("register");
globalThis.__registry = { ready: true };
export interface Registry {
  ready: boolean;
}
export interface RegistryOptions {
  strict: boolean;
}
export class Plugin {
  id = "plugin";
}
