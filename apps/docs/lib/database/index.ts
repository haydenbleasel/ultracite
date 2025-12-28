import 'server-only';

import { createDatabase } from '@ultracite/backend/database';
import { env } from '@/lib/env';

export const database = createDatabase(env.DATABASE_URL);

// Re-export types from backend
export type * from '@ultracite/backend/database';
