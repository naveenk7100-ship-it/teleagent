import { runMigrations } from '../dist/db/migrate.js';

runMigrations()
  .then((result) => {
    if (!result.success) {
      console.error('Migration failed:', result.error);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration fatal error:', err.message);
    process.exit(1);
  });
