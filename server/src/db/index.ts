import { db as jsonDb, JsonRepository } from './store.js';
import { PostgresRepository } from './postgresRepository.js';

let repository: JsonRepository;

if (process.env.DATABASE_URL) {
  repository = new PostgresRepository() as any;
} else {
  repository = jsonDb;
}

export { repository as db };
export * from './IRepository.js';
export * from './store.js';
