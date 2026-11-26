// Isolate collector database tests with rollback and close the pool after each test file.
import database from '@wx/shared/db.ts';
import { afterAll, onTestFinished } from 'vitest';

afterAll(async () => {
  await database.close();
});

export const setupDatabaseTest = async (): Promise<void> => {
  await database.getClient().raw('BEGIN');

  onTestFinished(async () => {
    await database.getClient().raw('ROLLBACK');
  });
};
