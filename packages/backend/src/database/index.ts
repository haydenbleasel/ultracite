import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from './generated/client';

export { PrismaClient } from './generated/client';
export * from './generated/client';

export const createDatabase = (connectionString: string) => {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
};
