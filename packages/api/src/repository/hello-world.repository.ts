// Read a placeholder greeting from PostgreSQL without requiring a table.
import database from '@wx/shared/db.ts';

export const readGreeting = async (): Promise<string> => {
  const { rows } = await database
    .getClient()
    .raw<{ rows: { message: string }[] }>("SELECT 'Hello' AS message");

  return rows[0].message;
};
