// Personalize the greeting retrieved from PostgreSQL.
import { readGreeting } from '#repository/hello-world.repository.ts';

export const getGreeting = async (name = 'World'): Promise<string> => {
  const greeting = await readGreeting();

  return `${greeting} ${name}!`;
};
