import { createServer } from './app';

const PORT = process.env.PORT || 4000;

const { server } = createServer();

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${PORT}`);
});

