/**
 * Runs the API against a throwaway in-memory MongoDB filled with demo data.
 * No Atlas account or .env needed:  npm run dev:demo
 * Data is lost when the process stops. Uploads still need Cloudinary keys in .env.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri('deskfolio-demo');
process.env.JWT_SECRET ||= 'local-demo-only-secret-not-for-production-use';
process.env.NODE_ENV ||= 'development';
// Vite dev server and `vite preview` (production build) ports.
process.env.CLIENT_ORIGINS ||= 'http://localhost:5173,http://localhost:4173';

// Import after the env is set: env.js validates process.env when first loaded.
await import('../src/server.js');
const { seedDemo } = await import('./seed.js');
const counts = await seedDemo();
console.info(`[demo] seeded ${counts.educators} educators and ${counts.students} students (logins: see scripts/seed.js)`);

const stop = async () => {
  await mongod.stop();
};
process.on('exit', () => {
  stop();
});
