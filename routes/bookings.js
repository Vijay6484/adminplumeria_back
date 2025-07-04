// const express = require('express');
// const router = express.Router();
// const pool = require('../dbcon');
// const crypto = require('crypto');
// const { v4: uuidv4 } = require('uuid');
// require('dotenv').config();
// const payu_key = process.env.PAYU_MERCHANT_KEY;
// const payu_salt = process.env.PAYU_MERCHANT_SALT;
// const PAYU_BASE_URL = 'https://test.payu.in';

// // BOOKING CLEANUP JOB
// const bookingCleanup = () => {
//   setInterval(async () => {
//     try {
//       const [result] = await pool.execute(
//         `UPDATE bookings 
//          SET payment_status = 'expired'
//          WHERE payment_status = 'pending'
//          AND created_at < NOW() - INTERVAL 1 HOUR`
//       );
//       console.log(`Marked ${result.affectedRows} bookings as expired`);
//     } catch (error) {
//       console.error('Booking cleanup error:', error);
//     }
//   }, 30 * 60 * 1000); // every 30 minutes
// };
// bookingCleanup();

// // GET /admin/bookings - fetch all bookings
// router.get('/', async (req, res) => {
//   try {
//     const { page = 1, limit = 20 } = req.query;
//     const offset = (page - 1) * limit;
//     const [bookings] = await pool.execute(`
//       SELECT 
//         b.id,
//         b.guest_name,
//         b.guest_email,
//         b.guest_phone,
//         a.name AS accommodation_name,
//         DATE_FORMAT(b.check_in, '%Y-%m-%d') AS check_in,
//         DATE_FORMAT(b.check_out, '%Y-%m-%d') AS check_out,
//         b.adults,
//         b.children,
//         b.rooms,
//         b.total_amount,
//         b.advance_amount,
//         b.payment_status,
//         b.payment_txn_id,
//         b.created_at
//       FROM bookings b
//       LEFT JOIN accommodations a ON b.accommodation_id = a.id
//       ORDER BY b.created_at DESC
//       LIMIT ? OFFSET ?
//     `, [parseInt(limit), parseInt(offset)]);

//     const [[{ count }]] = await pool.execute('SELECT COUNT(*) as count FROM bookings');

//     res.json({
//       success: true,
//       data: bookings,
//       pagination: {
//         total: count,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(count / limit)
//       }
//     });
//   } catch (error) {
//     console.error('Error fetching bookings:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch bookings',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // POST /admin/bookings - create booking
// router.post('/', async (req, res) => {
//   const connection = await pool.getConnection();
//   try {
//     await connection.beginTransaction();
//     const {
//       guest_name, guest_email, guest_phone, accommodation_id, package_id,
//       check_in, check_out, adults = 1, children = 0, rooms = 1,
//       food_veg = 0, food_nonveg = 0, food_jain = 0, total_amount,
//       advance_amount = 0, payment_method = 'payu'
//     } = req.body;

//     const requiredFields = ['guest_name', 'accommodation_id', 'package_id', 'check_in', 'check_out', 'total_amount'];
//     const missingFields = requiredFields.filter(field => !req.body[field]);

//     if (missingFields.length > 0) {
//       return res.status(400).json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` });
//     }

//     const totalGuests = adults + children;
//     const totalFood = food_veg + food_nonveg + food_jain;
//     if (totalFood !== totalGuests) {
//       return res.status(400).json({ success: false, error: 'Food preferences must match total guests' });
//     }

//     if (new Date(check_in) >= new Date(check_out)) {
//       return res.status(400).json({ success: false, error: 'Check-out must be after check-in' });
//     }

//     if (total_amount <= 0 || advance_amount < 0) {
//       return res.status(400).json({ success: false, error: 'Invalid amount values' });
//     }

//     if (adults < 1 || rooms < 1) {
//       return res.status(400).json({ success: false, error: 'Must have at least 1 adult and 1 room' });
//     }

//     const payment_status = 'pending';
//     const payment_txn_id = `BOOK-${uuidv4()}`;

//     const [result] = await connection.execute(`
//       INSERT INTO bookings (
//         guest_name, guest_email, guest_phone, accommodation_id, package_id,
//         check_in, check_out, adults, children, rooms, food_veg, food_nonveg, 
//         food_jain, total_amount, advance_amount, payment_status, payment_txn_id, created_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         guest_name, guest_email, guest_phone || null, accommodation_id, package_id,
//         check_in, check_out, adults, children, rooms, food_veg, food_nonveg,
//         food_jain, total_amount, advance_amount, payment_status, payment_txn_id, new Date()
//       ]
//     );

//     await connection.commit();

//     res.json({ success: true, data: { booking_id: result.insertId, payment_txn_id, payment_status } });

//   } catch (error) {
//     await connection.rollback();
//     console.error('Error creating booking:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create booking',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   } finally {
//     connection.release();
//   }
// });

// // POST /admin/bookings/payments/payu - Initiate PayU payment
// router.post('/payments/payu', async (req, res) => {
//   try {
//     const { amount, firstname, email, phone, booking_id, productinfo } = req.body;

//     if (!amount || !firstname || !email || !booking_id || !productinfo) {
//       return res.status(400).json({ success: false, error: 'Missing required payment parameters' });
//     }

//     if (isNaN(amount) || amount <= 0) {
//       return res.status(400).json({ success: false, error: 'Invalid amount' });
//     }

//     const cleanPhone = phone ? phone.toString().replace(/\D/g, '') : '';
//     if (cleanPhone.length < 10) {
//       return res.status(400).json({ success: false, error: 'Valid 10-digit phone required' });
//     }

//     const [booking] = await pool.execute(
//       'SELECT id FROM bookings WHERE id = ? AND payment_status = "pending"', [booking_id]
//     );
//     if (booking.length === 0) {
//       return res.status(404).json({ success: false, error: 'Pending booking not found' });
//     }

//     const txnid = `PAYU-${uuidv4()}`;
//     const udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '';
//     const truncatedProductinfo = productinfo.substring(0, 100);
//     const truncatedFirstname = firstname.substring(0, 60);
//     const truncatedEmail = email.substring(0, 50);

//     const hashString = `${payu_key}|${txnid}|${amount}|${truncatedProductinfo}|${truncatedFirstname}|${truncatedEmail}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${payu_salt}`;
//     const hash = crypto.createHash('sha512').update(hashString).digest('hex');

//     await pool.execute('UPDATE bookings SET payment_txn_id = ?, payment_status = "pending" WHERE id = ?', [txnid, booking_id]);

//     const paymentData = {
//       key: payu_key,
//       txnid,
//       amount,
//       productinfo: truncatedProductinfo,
//       firstname: truncatedFirstname,
//       email: truncatedEmail,
//       phone: cleanPhone.substring(0, 10),
//       surl: `https://a.plumeriaretreat.com/admin/bookings/verify/${txnid}`,
//       furl: `https://a.plumeriaretreat.com/bookings/verify/${txnid}`,
//       hash,
//       currency: "INR"
//     };

//     res.json({
//       success: true,
//       message: "Payment initiated",
//       payu_url: `${PAYU_BASE_URL}/_payment`,
//       payment_data: paymentData
//     });

//   } catch (error) {
//     console.error('PayU initiation error:', error);
//     res.status(500).json({ success: false, error: 'Payment initiation failed' });
//   }
// });

// // POST /admin/bookings/verify/:txnid - PayU verification callback + redirect
// router.post('/verify/:txnid', async (req, res) => {
//   console.log('Payment verification request received');
//   const { txnid } = req.params;
//   if (!txnid) {
//     return res.status(400).send("Transaction ID missing");
//   }

//   try {
//     const PayU = require("payu-websdk");
//     const payuClient = new PayU({ key: payu_key, salt: payu_salt });

//     console.log(`Verifying payment for txnid: ${txnid}`);

//     const verifiedData = await payuClient.verifyPayment(txnid);
//     const transaction = verifiedData.transaction_details[txnid];

//     console.log('Payment verification response:', transaction);

//     if (!transaction) {
//       return res.status(404).send("Transaction details not found");
//     }

//     if (transaction.status === "success") {
//       await pool.execute('UPDATE bookings SET payment_status = "success" WHERE payment_txn_id = ?', [txnid]);
//     } else {
//       await pool.execute('UPDATE bookings SET payment_status = "failed" WHERE payment_txn_id = ?', [txnid]);
//     }

//     return res.redirect(`https://plumeriaretreat.vercel.app/payment/${transaction.status}/${transaction.txnid}`);

//   } catch (error) {
//     console.error('Payment verification error:', error);
//     return res.status(500).send("Internal server error during payment verification");
//   }
// });

// // PUT /admin/bookings/:id/status - Manually update payment status
// router.put('/:id/status', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { payment_status } = req.body;

//     if (!payment_status) {
//       return res.status(400).json({ success: false, error: 'Payment status is required' });
//     }

//     const validStatuses = ['pending', 'success', 'failed', 'expired'];
//     if (!validStatuses.includes(payment_status)) {
//       return res.status(400).json({ success: false, error: 'Invalid payment status' });
//     }

//     const [result] = await pool.execute('UPDATE bookings SET payment_status = ? WHERE id = ?', [payment_status, id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ success: false, error: 'Booking not found' });
//     }

//     res.json({ success: true, message: 'Payment status updated' });

//   } catch (error) {
//     console.error('Error updating payment status:', error);
//     res.status(500).json({ success: false, error: 'Failed to update payment status' });
//   }
// });

// module.exports = router;



const express = require('express');
const router = express.Router();
const pool = require('../dbcon');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const payu_key = process.env.PAYU_MERCHANT_KEY;
const payu_salt = process.env.PAYU_MERCHANT_SALT;
const PAYU_BASE_URL = process.env.PAYU_BASE_URL || 'https://secure.payu.in'; // Production URL
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://plumeriaretreat.com';
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL || 'https://admin.plumeriaretreat.com';

// BOOKING CLEANUP JOB
const bookingCleanup = () => {
  setInterval(async () => {
    try {
      const [result] = await pool.execute(
        `UPDATE bookings 
         SET payment_status = 'expired'
         WHERE payment_status = 'pending'
         AND created_at < NOW() - INTERVAL 1 HOUR`
      );
      if (result.affectedRows > 0) {
        console.log(`Marked ${result.affectedRows} bookings as expired`);
      }
    } catch (error) {
      console.error('Booking cleanup error:', error);
    }
  }, 30 * 60 * 1000); // every 30 minutes
};
bookingCleanup();

// GET /admin/bookings - fetch all bookings
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate inputs
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      });
    }

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

// POST /admin/bookings - create booking
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const {
      guest_name, guest_email, guest_phone, accommodation_id, package_id,
      check_in, check_out, adults = 1, children = 0, rooms = 1,
      food_veg = 0, food_nonveg = 0, food_jain = 0, total_amount,
      advance_amount = 0, payment_method = 'payu'
    } = req.body;

    // Enhanced validation
    const requiredFields = ['guest_name', 'accommodation_id', 'package_id', 'check_in', 'check_out', 'total_amount'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (guest_email && !emailRegex.test(guest_email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    // Validate phone number (if provided)
    if (guest_phone) {
      const phoneRegex = /^[0-9]{10}$/;
      const cleanPhone = guest_phone.toString().replace(/\D/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone must be 10 digits' 
        });
      }
    }

    const totalGuests = adults + children;
    const totalFood = food_veg + food_nonveg + food_jain;
    if (totalFood !== totalGuests) {
      return res.status(400).json({ 
        success: false, 
        error: 'Food preferences must match total guests' 
      });
    }

    if (new Date(check_in) >= new Date(check_out)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Check-out must be after check-in' 
      });
    }

    if (total_amount <= 0 || advance_amount < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount values' 
      });
    }

    if (adults < 1 || rooms < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Must have at least 1 adult and 1 room' 
      });
    }

    const payment_status = 'pending';
    const payment_txn_id = `BOOK-${uuidv4()}`;

    const [result] = await connection.execute(`
      INSERT INTO bookings (
        guest_name, guest_email, guest_phone, accommodation_id, package_id,
        check_in, check_out, adults, children, rooms, food_veg, food_nonveg, 
        food_jain, total_amount, advance_amount, payment_status, payment_txn_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guest_name, 
        guest_email || null, 
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
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

// POST /admin/bookings/payments/payu - Initiate PayU payment
router.post('/payments/payu', async (req, res) => {
  try {
    const { amount, firstname, email, phone, booking_id, productinfo } = req.body;

    // Enhanced validation
    if (!amount || !firstname || !email || !booking_id || !productinfo) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required payment parameters' 
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount' 
      });
    }

    const cleanPhone = phone ? phone.toString().replace(/\D/g, '') : '';
    if (cleanPhone.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid 10-digit phone required' 
      });
    }

    const [booking] = await pool.execute(
      'SELECT id FROM bookings WHERE id = ? AND payment_status = "pending"', 
      [booking_id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pending booking not found' 
      });
    }

    const txnid = `PAYU-${uuidv4()}`;
    const udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '';
    const truncatedProductinfo = productinfo.substring(0, 100);
    const truncatedFirstname = firstname.substring(0, 60);
    const truncatedEmail = email.substring(0, 50);

    const hashString = `${payu_key}|${txnid}|${amount}|${truncatedProductinfo}|${truncatedFirstname}|${truncatedEmail}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${payu_salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    await pool.execute(
      'UPDATE bookings SET payment_txn_id = ?, payment_status = "pending" WHERE id = ?', 
      [txnid, booking_id]
    );

    const paymentData = {
      key: payu_key,
      txnid,
      amount,
      productinfo: truncatedProductinfo,
      firstname: truncatedFirstname,
      email: truncatedEmail,
      phone: cleanPhone.substring(0, 10),
      surl: `${ADMIN_BASE_URL}/admin/bookings/verify/${txnid}`, // Production callback
      furl: `${ADMIN_BASE_URL}/admin/bookings/verify/${txnid}`,    // Production failure URL
      hash,
      currency: "INR"
    };

    res.json({
      success: true,
      message: "Payment initiated",
      payu_url: `${PAYU_BASE_URL}/_payment`,
      payment_data: paymentData
    });

  } catch (error) {
    console.error('PayU initiation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Payment initiation failed' 
    });
  }
});

// POST /admin/bookings/verify/:txnid - PayU verification callback
router.post('/verify/:txnid', async (req, res) => {
  console.log('Payment verification request received');
  const { txnid } = req.params;
  
  if (!txnid) {
    return res.status(400).send("Transaction ID missing");
  }

  try {
    const PayU = require("payu-websdk");
    const payuClient = new PayU({ 
      key: payu_key, 
      salt: payu_salt,
      production: true // Enable production mode
    });

    console.log(`Verifying payment for txnid: ${txnid}`);

    const verifiedData = await payuClient.verifyPayment(txnid);
    console.log('Payment verification response:', verifiedData);
    const transaction = verifiedData.transaction_details[txnid];

    if (!transaction) {
      return res.status(404).send("Transaction details not found");
    }

    // Update booking status based on PayU response
    if (transaction.status === "success") {
      await pool.execute(
        'UPDATE bookings SET payment_status = "success" WHERE payment_txn_id = ?', 
        [txnid]
      );
    } else {
      await pool.execute(
        'UPDATE bookings SET payment_status = "failed" WHERE payment_txn_id = ?', 
        [txnid]
      );
    }

    // Redirect to frontend with payment status
    return res.redirect(
      `${FRONTEND_BASE_URL}/payment/${transaction.status}/${transaction.txnid}`
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).send("Internal server error during payment verification");
  }
});

// PUT /admin/bookings/:id/status - Update payment status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment status is required' 
      });
    }

    const validStatuses = ['pending', 'success', 'failed', 'expired'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment status' 
      });
    }

    const [result] = await pool.execute(
      'UPDATE bookings SET payment_status = ? WHERE id = ?', 
      [payment_status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Booking not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Payment status updated' 
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