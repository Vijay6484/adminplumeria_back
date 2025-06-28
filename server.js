const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const process = require('process');
const dotenv = require('dotenv');
const safeParse = require('./utils/safeParse'); // ✅ Added this line
const pool = require('./dbcon'); // Import the database connection pool
dotenv.config();
const app = express();
const port = 5000;

// Middleware
app.use(cors({
  origin:['http://localhost:5173', 'https://adminplumeria.vercel.app/', 'https://plumeriaretreat.vercel.app','http://localhost:5174/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());

// ✅ Make safeParse globally available to all routes if needed
app.use((req, res, next) => {
  req.safeParse = safeParse;
  next();
});
// Add this to your application startup
// Make sure to import process at the top of your file


// Connection cleanup interval
const cleanupInterval = setInterval(async () => {
  let conn;
  console.log('[Cleanup] Running connection cleanup task...');
  
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(`
      SELECT id FROM information_schema.processlist 
      WHERE USER = ? AND COMMAND = 'Sleep' AND TIME > 60
    `, [process.env.DB_USER]);

    if (rows.length > 0) {
      console.log(`[Cleanup] Found ${rows.length} stale connections to kill`);
    }

    for (const row of rows) {
      try {
        await conn.query('KILL ?', [row.id]);
        console.log(`[Cleanup] Killed connection ${row.id}`);
      } catch (killError) {
        console.error(`[Cleanup] Failed to kill ${row.id}:`, killError.message);
      }
    }
  } catch (err) {
    console.error('[Cleanup] Error during cleanup:', err);
  } finally {
    if (conn) {
      try {
        await conn.release();
        console.log('[Cleanup] Connection released');
      } catch (releaseError) {
        console.error('[Cleanup] Error releasing connection:', releaseError);
      }
    }
  }
}, 300000); // Runs every 5 minutes (300000 ms)

// Enhanced graceful shutdown handler
const shutdown = async () => {
  console.log('\n[Shutdown] Starting graceful shutdown...');
  
  clearInterval(cleanupInterval);
  console.log('[Shutdown] Stopped connection cleanup interval');
  
  try {
    await pool.end();
    console.log('[Shutdown] Database pool closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('[Shutdown] Error closing pool:', err);
    process.exit(1);
  }
};

// Handle different shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Import routes
const propertiesRoutes = require('./routes/properties');
const dashboardRoutes = require('./routes/dashboard');
const galleryRoutes = require('./routes/gallery');
const userRoutes = require('./routes/users');
const couponRoutes = require('./routes/coupons');
const citiesRoutes = require('./routes/cities');
const amenitiesRoutes = require('./routes/ammenities');
const bookingRoutes = require('./routes/bookings');
const ratingsRoutes = require('./routes/ratings');
const calendarRoutes = require('./routes/calendar');

// Use routes
app.use('/admin/dashboard', dashboardRoutes);
app.use('/admin/properties', propertiesRoutes);
app.use('/admin/gallery', galleryRoutes);
app.use('/admin/users', userRoutes);
app.use('/admin/coupons', couponRoutes);
app.use('/admin/cities', citiesRoutes);
app.use('/admin/amenities', amenitiesRoutes);
app.use('/admin/bookings', bookingRoutes);
app.use('/admin/ratings', ratingsRoutes);
app.use('/admin/calendar', calendarRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
