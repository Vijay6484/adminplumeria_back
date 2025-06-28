const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'in-mum-web1671.main-hosting.eu',
  user: process.env.DB_USER || 'u973488458_plumeria',
  password: process.env.DB_PASSWORD || 'Plumeria_retreat1234',
  database: process.env.DB_NAME || 'u973488458_plumeria',
  port: parseInt(process.env.DB_PORT || '3306'),
  
  // Optimized pool settings
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 100,
  connectTimeout: 10000,
  idleTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // Enable prepared statements
  namedPlaceholders: true
});

// Event listeners for debugging
pool.on('acquire', (connection) => {
  console.log(`Connection ${connection.threadId} acquired`);
});

pool.on('release', (connection) => {
  console.log(`Connection ${connection.threadId} released`);
});

pool.on('enqueue', () => {
  console.log('Waiting for available connection slot...');
});

pool.on('connection', (connection) => {
  console.log(`New connection established: ${connection.threadId}`);
});

// Graceful shutdown handler
const shutdown = async () => {
  console.log('\n[Shutdown] Closing database pool...');
  try {
    await pool.end();
    console.log('[Shutdown] Pool closed successfully');
  } catch (err) {
    console.error('[Shutdown] Error closing pool:', err);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = pool;