import 'server-only';

import { createDatabase } from '@ultracite/backend/database';

export const database = createDatabase();

// Re-export types from backend
export type * from '@ultracite/backend/database';
