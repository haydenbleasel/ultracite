import type { User } from "./user";

export interface Team {
  id: string;
  members: User[];
}
