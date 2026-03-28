import { createServer } from 'vite';
const server = await createServer({ logLevel: 'info' });
await server.listen();
server.printUrls();
await new Promise(() => {});
