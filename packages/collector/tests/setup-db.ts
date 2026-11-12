// Isolate collector database tests with rollback and close the pool after each test file.
import { afterAll, onTestFinished } from 'vitest';

import database from '#db/db.ts';

afterAll(async () => {
  await database.close();
});

export const setupDatabaseTest = async (): Promise<void> => {
  await database.getClient().raw('BEGIN');

  onTestFinished(async () => {
    await database.getClient().raw('ROLLBACK');
  });
};
