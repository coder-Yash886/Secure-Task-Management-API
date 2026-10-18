const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  console.warn(' WARNING: DATABASE_URL is not set in .env file!');
}

const isProduction = process.env.NODE_ENV === 'production';
const isNeon = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction || isNeon ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() AS current_time, current_database() AS db_name');
    console.log('✅ PostgreSQL connected successfully!');
    console.log(`Connected to database: ${res.rows[0].db_name} at ${res.rows[0].current_time}`);
    return { success: true, ...res.rows[0] };
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
};
