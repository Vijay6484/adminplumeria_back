const express = require('express');
const router = express.Router();
const pool = require('../dbcon');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// BOOKING CLEANUP JOB - RUNS AUTOMATICALLY
const bookingCleanup = () => {
  setInterval(async () => {
    try {
      const [result] = await pool.execute(
        `UPDATE bookings 
         SET payment_status = 'expired'
         WHERE payment_status = 'pending'
         AND created_at < NOW() - INTERVAL 1 HOUR`
      );
      console.log(`Marked ${result.affectedRows} bookings as expired`);
    } catch (error) {
      console.error('Booking cleanup error:', error);
    }
  }, 30 * 60 * 1000); // Run every 30 minutes
};
bookingCleanup();

// GET /admin/bookings - fetch all bookings with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [bookings] = await pool.execute(`
      SELECT 
        b.id,
        b.guest_name,
        b.guest_email,
        b.guest_phone,
        a.name AS accommodation_name,
        DATE_FORMAT(b.check_in, '%Y-%m-%d') AS check_in,
        DATE_FORMAT(b.check_out, '%Y-%m-%d') AS check_out,
        b.adults,
        b.children,
        b.rooms,
        b.total_amount,
        b.advance_amount,
        b.payment_status,
        b.payment_txn_id,
        b.created_at
      FROM bookings b
      LEFT JOIN accommodations a ON b.accommodation_id = a.id
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const [[{ count }]] = await pool.execute('SELECT COUNT(*) as count FROM bookings');

    res.json({
      success: true,
      data: bookings,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch bookings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /admin/bookings - create a new booking with transaction
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      guest_name,
      guest_email,
      guest_phone,
      accommodation_id,
      package_id,
      check_in,
      check_out,
      adults = 1,
      children = 0,
      rooms = 1,
      food_veg = 0,
      food_nonveg = 0,
      food_jain = 0,
      total_amount,
      advance_amount = 0,
      payment_method = 'payu',
    } = req.body;

    // Required fields validation
    const requiredFields = ['guest_name', 'accommodation_id', 'package_id', 'check_in', 'check_out', 'total_amount'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Food preferences validation
    const totalGuests = adults + children;
    const totalFood = food_veg + food_nonveg + food_jain;
    if (totalFood !== totalGuests) {
      return res.status(400).json({
        success: false,
        error: 'Food preferences must match total number of guests'
      });
    }

    // Date validation
    if (new Date(check_in) >= new Date(check_out)) {
      return res.status(400).json({
        success: false,
        error: 'Check-out date must be after check-in date'
      });
    }

    // Amount validation
    if (total_amount <= 0 || advance_amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount values'
      });
    }

    // Guest count validation
    if (adults < 1 || rooms < 1) {
      return res.status(400).json({
        success: false,
        error: 'Must have at least 1 adult and 1 room'
      });
    }

    // ALWAYS SET INITIAL STATUS TO PENDING
    const payment_status = 'pending';
    const payment_txn_id = `BOOK-${uuidv4()}`;

    // Create booking
    const [result] = await connection.execute(
      `INSERT INTO bookings (
        guest_name, guest_email, guest_phone, accommodation_id, package_id,
        check_in, check_out, adults, children, rooms, food_veg, food_nonveg, 
        food_jain, total_amount, advance_amount, payment_status, 
        payment_txn_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guest_name, 
        guest_email, 
        guest_phone || null,
        accommodation_id, 
        package_id,
        check_in, 
        check_out,
        adults, 
        children, 
        rooms, 
        food_veg, 
        food_nonveg, 
        food_jain, 
        total_amount,
        advance_amount, 
        payment_status,
        payment_txn_id, 
        new Date()
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      data: {
        booking_id: result.insertId,
        payment_txn_id,
        payment_status
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating booking:', error);
    
    const errorDetails = process.env.NODE_ENV === 'development' ? {
      message: error.message,
      stack: error.stack,
      sql: error.sql
    } : undefined;
    
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      details: errorDetails
    });
  } finally {
    connection.release();
  }
});

// POST /admin/bookings/payments/payu - Initiate PayU payment
  router.post('/payments/payu', async (req, res) => {
    try {
      const PAYU_MERCHANT_KEY = "rFrruE9E";
      const PAYU_MERCHANT_SALT = "DvYeVsKfYU";
      const PAYU_BASE_URL = 'https://secure.payu.in/_payment';
      const PAYU_SUCCESS_URL = `${process.env.FRONTEND_URL}/payment/success`;
      const PAYU_FAILURE_URL = `${process.env.FRONTEND_URL}/payment/failure`;

      const {
        amount,
        firstname,
        email,
        phone,
        booking_id,
        productinfo = `Booking ${booking_id}`
      } = req.body;

      // Validate payment gateway configuration
      if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
        console.error('Payment gateway configuration missing');
        return res.status(500).json({
          success: false,
          error: 'Payment gateway configuration missing'
        });
      }

      // Validate required fields
      if (!amount || !firstname || !email || !booking_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment parameters'
        });
      }

      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount'
        });
      }

      // Validate phone number
      const cleanPhone = phone ? phone.toString().replace(/\D/g, '') : '';
      if (cleanPhone.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Valid 10-digit phone number required'
        });
      }

      // Verify booking exists
      const [booking] = await pool.execute(
        'SELECT id, total_amount FROM bookings WHERE id = ? AND payment_status = "pending"',
        [booking_id]
      );

      if (booking.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Pending booking not found'
        });
      }

      // Generate transaction ID
      const txnid = `PAYU-${uuidv4()}`;

      // Prepare hash string
      const hashString = [
        PAYU_MERCHANT_KEY.trim(),
        txnid.trim(),
        String(amount).trim(),
        (productinfo || '').substring(0, 100).trim(),
        firstname.substring(0, 60).trim(),
        email.substring(0, 50).trim(),
        ...Array(10).fill(''), // udf1-udf10
        PAYU_MERCHANT_SALT.trim()
      ].join('|');

      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      const paymentData = {
        key: PAYU_MERCHANT_KEY,
        txnid,
        amount: amount,
        productinfo,
        firstname,
        email,
        phone: cleanPhone.substring(0, 10),
        surl: `${PAYU_SUCCESS_URL}?booking_id=${booking_id}`,
        furl: `${PAYU_FAILURE_URL}?booking_id=${booking_id}`,
        hash,
        service_provider: 'payu_paisa',
        udf1: booking_id.toString() // Critical for callback
      };

      // Update booking with transaction ID
      await pool.execute(
        'UPDATE bookings SET payment_txn_id = ? WHERE id = ?',
        [txnid, booking_id]
      );

      res.json({
        success: true,
        payu_url: PAYU_BASE_URL,
        payment_data: paymentData
      });

    } catch (error) {
      console.error('Error initiating PayU payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate payment',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

// PAYU CALLBACK HANDLER
router.post('/payments/callback', async (req, res) => {
  try {
    const { txnid, status, amount, hash, error_Message, udf1 } = req.body;
    const bookingId = udf1;

    // Validate required fields
    if (!txnid || !status || !hash || !bookingId) {
      console.error('Invalid callback data:', req.body);
      return res.status(400).send('Invalid callback data');
    }

    // Verify hash
    const hashString = [
      process.env.PAYU_MERCHANT_KEY,
      txnid,
      amount,
      req.body.productinfo || '',
      req.body.firstname || '',
      req.body.email || '',
      ...Array(10).fill(''), // udf2-udf10
      process.env.PAYU_MERCHANT_SALT
    ].join('|');
    
    const computedHash = crypto.createHash('sha512').update(hashString).digest('hex');
    
    if (computedHash !== hash) {
      console.error('Hash verification failed');
      return res.status(400).send('Invalid hash');
    }

    // Find booking
    const [booking] = await pool.execute(
      'SELECT id, total_amount, advance_amount FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (booking.length === 0) {
      console.error('Booking not found for callback:', bookingId);
      return res.status(404).send('Booking not found');
    }

    const bookingData = booking[0];
    let paymentStatus;

    // Handle payment success
    if (status === 'success') {
      paymentStatus = parseFloat(amount) >= parseFloat(bookingData.total_amount)
        ? 'success'
        : 'partial';
        
      await pool.execute(
        `UPDATE bookings SET 
          payment_status = ?,
          payment_txn_id = ?,
          advance_amount = ?
         WHERE id = ?`,
        [paymentStatus, txnid, amount, bookingId]
      );
      
      res.redirect(`${process.env.FRONTEND_URL}/payment/success?booking_id=${bookingId}`);
    } 
    // Handle payment failure
    else {
      paymentStatus = 'failed';
      
      await pool.execute(
        `UPDATE bookings SET 
          payment_status = ?,
          payment_error = ?
         WHERE id = ?`,
        [paymentStatus, error_Message || 'Payment failed', bookingId]
      );
      
      res.redirect(`${process.env.FRONTEND_URL}/payment/failure?booking_id=${bookingId}&error=${encodeURIComponent(error_Message || 'Payment failed')}`);
    }

  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).send('Payment processing failed');
  }
});

// PAYMENT VERIFICATION ENDPOINT
router.get('/:id/verify', async (req, res) => {
  try {
    const [booking] = await pool.execute(
      `SELECT payment_status 
       FROM bookings WHERE id = ?`,
      [req.params.id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Booking not found' 
      });
    }

    res.json({
      success: true,
      verified: ['partial', 'success'].includes(booking[0].payment_status)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Verification failed' 
    });
  }
});

// PAYMENT RETRY ENDPOINT
router.get('/:id/retry-payment', async (req, res) => {
  try {
    const [booking] = await pool.execute(
      `SELECT id, advance_amount, guest_name, guest_email, guest_phone 
       FROM bookings 
       WHERE id = ? 
         AND payment_status IN ('failed', 'expired')`,
      [req.params.id]
    );
    
    if (booking.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Booking not eligible for retry'
      });
    }

    const bookingData = booking[0];
    const productinfo = `Retry payment for booking ${bookingData.id}`;

    // Generate new transaction ID
    const txnid = `PAYU-RETRY-${uuidv4()}`;

    // Prepare hash
    const hashString = [
      process.env.PAYU_MERCHANT_KEY,
      txnid,
      String(bookingData.advance_amount),
      productinfo.substring(0, 100),
      bookingData.guest_name.substring(0, 60),
      bookingData.guest_email.substring(0, 50),
      ...Array(10).fill(''),
      process.env.PAYU_MERCHANT_SALT
    ].join('|');

    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const paymentData = {
      key: process.env.PAYU_MERCHANT_KEY,
      txnid,
      amount: String(bookingData.advance_amount),
      productinfo,
      firstname: bookingData.guest_name,
      email: bookingData.guest_email,
      phone: bookingData.guest_phone ? bookingData.guest_phone.replace(/\D/g, '').substring(0, 10) : '',
      surl: `${process.env.PAYU_SUCCESS_URL}?booking_id=${bookingData.id}`,
      furl: `${process.env.PAYU_FAILURE_URL}?booking_id=${bookingData.id}`,
      hash,
      service_provider: 'payu_paisa',
      udf1: bookingData.id.toString()
    };

    // Update booking with new transaction ID
    await pool.execute(
      'UPDATE bookings SET payment_txn_id = ? WHERE id = ?',
      [txnid, bookingData.id]
    );

    res.json({
      success: true,
      payu_url: process.env.PAYU_BASE_URL,
      payment_data: paymentData
    });

  } catch (error) {
    console.error('Payment retry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare payment retry'
    });
  }
});

// PUT /admin/bookings/:id/status - Update payment status (for manual updates)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_txn_id } = req.body;

    if (!payment_status || !['success', 'failed', 'pending', 'partial', 'expired'].includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment status is required'
      });
    }

    const [result] = await pool.execute(
      'UPDATE bookings SET payment_status = ?, payment_txn_id = ? WHERE id = ?',
      [payment_status, payment_txn_id || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
});

module.exports = router;