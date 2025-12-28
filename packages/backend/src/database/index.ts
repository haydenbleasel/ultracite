import { PrismaClient } from './generated/client';

export { PrismaClient } from './generated/client';
export * from './generated/client';

export const createDatabase = () => {
  return new PrismaClient();
};
