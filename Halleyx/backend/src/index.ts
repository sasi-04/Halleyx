import 'dotenv/config';
import { createServer } from './app';
import { ensureInitialUsersAndWorkflows } from "./bootstrap/ensureInitialEmployee";

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await ensureInitialUsersAndWorkflows();
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[bootstrap] failed to ensure initial users/workflows", err?.message ?? err);
  }

  const { server } = createServer();

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[server] fatal error during startup", err);
});

