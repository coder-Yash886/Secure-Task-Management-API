const { testConnection, pool } = require('../src/config/db');

async function main() {
  console.log('Testing Neon PostgreSQL connection...');
  const result = await testConnection();
  if (result.success) {
    console.log('Database handshake completed successfully.');
  } else {
    console.error('Handshake failed. Please verify your DATABASE_URL in .env');
  }
  await pool.end();
  process.exit(result.success ? 0 : 1);
}

main();
