const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'in-mum-web1671.main-hosting.eu',
  user: process.env.DB_USER || 'u973488458_plumeria',
  password: process.env.DB_PASSWORD || 'Plumeria_retreat1234',
  database: process.env.DB_NAME || 'u973488458_plumeria',
  port: parseInt(process.env.DB_PORT || '3306'),
  
  // Valid connection pool options
  connectionLimit: 5,              // Reduced connection limit
  waitForConnections: true,        // Wait for connections when pool is full
  queueLimit: 0,                   // Unlimited queue (but monitor)
  
  // Valid connection options
  connectTimeout: 10000,           // 10 second connection timeout
  idleTimeout: 60000,              // Close idle connections after 60s
  enableKeepAlive: true,           // Maintain connection health
  keepAliveInitialDelay: 10000     // Start keepalive after 10s
});

// Add event listeners for debugging
pool.on('acquire', (connection) => {
  console.log(`Connection ${connection.threadId} acquired`);
});

pool.on('release', (connection) => {
  console.log(`Connection ${connection.threadId} released`);
});

pool.on('enqueue', () => {
  console.log('Waiting for available connection slot...');
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Pool has ended');
    process.exit(0);
  } catch (err) {
    console.error('Error closing pool:', err);
    process.exit(1);
  }
});

module.exports = pool;