const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const safeParse = require('./utils/safeParse'); // ✅ Added this line

dotenv.config();
const app = express();
const port = 5000;

// Middleware
app.use(cors({methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());

// ✅ Make safeParse globally available to all routes if needed
app.use((req, res, next) => {
  req.safeParse = safeParse;
  next();
});

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
