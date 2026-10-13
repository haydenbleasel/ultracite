import { describe } from "./index";

export interface Model {
  label: string;
}

export const label = (): string => describe();
