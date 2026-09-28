export interface UltraciteOverride {
  files: string | string[];
  extends: string[];
}

export interface UltraciteConfig {
  extends?: string[];
  overrides?: UltraciteOverride[];
}

export declare function defineConfig<T extends UltraciteConfig>(config: T): T;
