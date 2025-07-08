// const express = require('express');
// const router = express.Router();
// const pool = require('../dbcon');
// const crypto = require('crypto');
// const PayU = require("payu-websdk");
// const { v4: uuidv4 } = require('uuid');
// require('dotenv').config();
// const payu_key ="n5ikm0"//process.env.PAYU_MERCHANT_KEY;
// const payu_salt = "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCS2TYPoivPA9qOZW+c+evpYJGF9I6Ti/FVL3+3AyEImmWr9kd8NXRnWkRw79JmzJ+wUL1HkuloTCEvOcnoN16sd2bQ3n4j2WRca0QkHbx4JougH3NKfUkVIo2n21xlaxu9xiIjMZF1OQbNhMJfid/vP7FSaUhLdN46aWvyjxohK30IRvGnXbOH3666UtJXDSvebtrClLfUdX/9zOXLUU45vncGyCtylNiADLW5dMR5EkB8vQwpFXbQ+79LG9RRSDD8yCIJbd8Z4EB5gt1rQwdiUeV2T45ncSETFNKudUtwt/SxffzQPH5qDiyU2D35Cc5lUQQmELjK9aLYI/ge6ss1AgMBAAECggEAFxolc2GttzBxxIeoPr+hsdIvqq2N9Z/lPGPP2ZScMIyLtLk2x09oi+7rSAIurV4BPF2DXZx67F3XtaSHg2kck5DoQ7FREmY7r/9vFah480ULH8p62ovpwLGyK+dqeokWcO1YBwXgDptFWvVJF/sql+rDBIZMKZTN9k4J/buuHmwKQEqOowUBQWP1oo0Sgrnv48nQqlPfGatxq7U4w4hRLf3l6UR0c/mPHVb00UabBaZzZ9B/jMMasHDtLKYQ/69VtCo2QVm9Kykh3bRHKjiAF5f606gHiewILi3jj+lcnUrcDL1pFkBqskrJ8NibHfdJkaT1w3W1n463cLfCCntD2QKBgQC67h1lGo3avoB4GdoGMzqsDg9Bub0FpI2/lnL5oeFgygRvYRBb78E3fUKuYIWcUjiZaTgukIsMtZKPEpv90tJXua5dQEOOip9D4SQddHoT7MNToFFKJ5pXzHonc8dSMQYLV3LeR1V/9inJhrRPjedhr1jdJBMLZIAOe/mZBDh8CQKBgQDJG7zPL0sua6WkX6lLX0JydmEjbOFedeL2olY3pm8Vj0iC1ejUzsYrRwHEc1YUr2bO0NQ0uQ64dLhl+AXu2HwCWu7aRKMas0lg4uFemcmerqUMd1ozJJfI3fhjfSaFXwSqn5LcclUCXt/LOx49cxN9HmPHYNpyvV+P17gchIG4zQKBgCL95+rBKcTE3G+fBz0Z4eXLS/fVuRiRUSeIFkW8k9/2cRYYaWOMYfLtM8pIrzov+gBdvfKZhC4A30qBBUpiaJWbYJR8LylDscSXJJeO8jtAmt/QpubmuvGsiUFRXwJ3wtXkrNAHMm4dunzLBn3N5n5WwJ/E3PvI+F+9vV9zds9hAoGAdz5eHo8RSe4EIkmibRGHqaztff7SRpspv0mUS50A4sy5lvJVAtG0CPcqYhxtHwi9scV6/eP4iYCT0cpVYkC0jwTx+TOXbn599Nex/9C6Dr/JF3IxZn+9DBopbHxJee1ULANAJjwYkbZFhhCAprj0Bk0dppuUC1KkNfsXrLkY3cUCgYAYdRxY9KFg97jhRyD25LKTHbLyp5+rd53UxxNM5GGaxwHCe0FPj9jTD9x6NoGIg1cLDeaTIy20a4cDJx5v50yrMFvnbIMCcQ4nm71GfXUtO53O/k4ptTk9jVlM8ymJ/kK0956OODrrCTz/4Sur4+11gkd1LAw+MfKHZ8gtWrswPQ==";//process.env.PAYU_MERCHANT_SALT;
// const PAYU_BASE_URL ='https://test.payu.in'// process.env.PAYU_BASE_URL||'https://secure.payu.in';//for production 'https://secure.payu.in'; // for testing 'https://test.payu.in';
// const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
// const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL;
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
//       surl: `https://plumeriaretreat.vercel.app/payment/success/${txnid}`,
//       furl: `https://plumeriaretreat.vercel.app/payment/failed/${txnid}`,
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
// router.get('/payment-status/:txnid', async (req, res) => {
//   try {
//     const { txnid } = req.params;
//     const { force_payu } = req.query; // Add query parameter to force PayU check

//     if (!txnid) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Transaction ID is required' 
//       });
//     }

//     // Get booking from database
//     const [bookings] = await pool.execute(
//       'SELECT id, payment_status, payment_txn_id, total_amount, advance_amount, created_at FROM bookings WHERE payment_txn_id = ?',
//       [txnid]
//     );

//     if (bookings.length === 0) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Transaction not found' 
//       });
//     }

//     const booking = bookings[0];

//     // If force_payu is true, OR status is failed/pending, check with PayU
//     const shouldCheckPayU = force_payu === 'true' || 
//                            booking.payment_status === 'failed' || 
//                            booking.payment_status === 'pending';

//     if (!shouldCheckPayU && booking.payment_status === 'success') {
//       return res.json({
//         success: true,
//         data: {
//           txnid,
//           status: booking.payment_status,
//           source: 'database',
//           booking_id: booking.id,
//           amount: booking.advance_amount || booking.total_amount,
//           message: 'Payment already confirmed as successful'
//         }
//       });
//     }

//     // Check with PayU
//     try {
//       const PayU = require("payu-websdk");
//       const payuClient = new PayU({ key: payu_key, salt: payu_salt });

//       console.log(`Force checking payment status for txnid: ${txnid}`);

//       const verifiedData = await payuClient.verifyPayment(txnid);

//       if (!verifiedData || !verifiedData.transaction_details || !verifiedData.transaction_details[txnid]) {
//         console.log('PayU verification returned no data for:', txnid);

//         // If no data from PayU, but customer says payment debited, 
//         // return database status with warning
//         return res.json({
//           success: true,
//           data: {
//             txnid,
//             status: booking.payment_status,
//             source: 'database',
//             booking_id: booking.id,
//             amount: booking.advance_amount || booking.total_amount,
//             warning: 'PayU verification returned no data - check merchant dashboard manually',
//             payu_response: verifiedData
//           }
//         });
//       }

//       const transaction = verifiedData.transaction_details[txnid];
//       console.log('PayU transaction details:', transaction);

//       // Determine final status
//       let finalStatus = 'pending';
//       if (transaction.status === 'success') {
//         finalStatus = 'success';
//       } else if (transaction.status === 'failure' || transaction.status === 'failed') {
//         finalStatus = 'failed';
//       }

//       // Update database if status changed
//       if (finalStatus !== booking.payment_status) {
//         await pool.execute(
//           'UPDATE bookings SET payment_status = ? WHERE payment_txn_id = ?',
//           [finalStatus, txnid]
//         );

//         console.log(`Updated booking ${booking.id} status from ${booking.payment_status} to ${finalStatus}`);
//       }

//       return res.json({
//         success: true,
//         data: {
//           txnid,
//           status: finalStatus,
//           source: 'payu',
//           booking_id: booking.id,
//           amount: transaction.amount || booking.advance_amount || booking.total_amount,
//           payment_id: transaction.mihpayid,
//           payment_mode: transaction.mode,
//           bank_ref_num: transaction.bank_ref_num,
//           payu_status: transaction.status,
//           status_updated: finalStatus !== booking.payment_status,
//           original_db_status: booking.payment_status
//         }
//       });

//     } catch (payuError) {
//       console.error('PayU verification error:', payuError);

//       // Return database status with error info
//       return res.json({
//         success: true,
//         data: {
//           txnid,
//           status: booking.payment_status,
//           source: 'database',
//           booking_id: booking.id,
//           amount: booking.advance_amount || booking.total_amount,
//           error: 'PayU verification failed',
//           error_details: payuError.message,
//           recommendation: 'Check PayU merchant dashboard manually'
//         }
//       });
//     }

//   } catch (error) {
//     console.error('Error checking payment status:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to check payment status',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });
// // POST /admin/bookings/verify/:txnid - PayU verification callback + redirect
// router.get('/verify/:txnid', async (req, res) => {
//   console.log('Payment verification request received');
//   const { txnid } = req.params;
//   if (!txnid) {
//     return res.status(400).send("Transaction ID missing");
//   }

//   try {
//     const PayU = require("payu-websdk");
//     const payuClient = new PayU({ key: payu_key, salt: payu_salt });

//     console.log(`Verifying payment for txnid: ${txnid}`);

//     let verifiedData;
//     try {
//       verifiedData = await payuClient.verifyPayment(txnid);
//       console.log('Full payment verification response:', verifiedData);
//     } catch (sdkError) {
//       console.error('Error during PayU SDK verifyPayment call:', sdkError);
//       return res.status(500).send("Failed to communicate with payment gateway");
//     }

//     if (!verifiedData || !verifiedData.transaction_details || !verifiedData.transaction_details[txnid]) {
//       console.error('Payment verification failed: Missing transaction details', verifiedData);
//       return res.status(404).send("Transaction details not found");
//     }

//     const transaction = verifiedData.transaction_details[txnid];
//     console.log('Payment verification response:', transaction);

//     if (transaction.status === "success") {
//       await pool.execute('UPDATE bookings SET payment_status = "success" WHERE payment_txn_id = ?', [txnid]);
//     } else {
//       await pool.execute('UPDATE bookings SET payment_status = "failed" WHERE payment_txn_id = ?', [txnid]);
//     }

//     return res.redirect(`${FRONTEND_BASE_URL}/payment/${transaction.status}/${transaction.txnid}`);

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
const PayU = require("payu-websdk");
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const payu_key = "n5ikm0"; //process.env.PAYU_MERCHANT_KEY;
const payu_salt = "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCS2TYPoivPA9qOZW+c+evpYJGF9I6Ti/FVL3+3AyEImmWr9kd8NXRnWkRw79JmzJ+wUL1HkuloTCEvOcnoN16sd2bQ3n4j2WRca0QkHbx4JougH3NKfUkVIo2n21xlaxu9xiIjMZF1OQbNhMJfid/vP7FSaUhLdN46aWvyjxohK30IRvGnXbOH3666UtJXDSvebtrClLfUdX/9zOXLUU45vncGyCtylNiADLW5dMR5EkB8vQwpFXbQ+79LG9RRSDD8yCIJbd8Z4EB5gt1rQwdiUeV2T45ncSETFNKudUtwt/SxffzQPH5qDiyU2D35Cc5lUQQmELjK9aLYI/ge6ss1AgMBAAECggEAFxolc2GttzBxxIeoPr+hsdIvqq2N9Z/lPGPP2ZScMIyLtLk2x09oi+7rSAIurV4BPF2DXZx67F3XtaSHg2kck5DoQ7FREmY7r/9vFah480ULH8p62ovpwLGyK+dqeokWcO1YBwXgDptFWvVJF/sql+rDBIZMKZTN9k4J/buuHmwKQEqOowUBQWP1oo0Sgrnv48nQqlPfGatxq7U4w4hRLf3l6UR0c/mPHVb00UabBaZzZ9B/jMMasHDtLKYQ/69VtCo2QVm9Kykh3bRHKjiAF5f606gHiewILi3jj+lcnUrcDL1pFkBqskrJ8NibHfdJkaT1w3W1n463cLfCCntD2QKBgQC67h1lGo3avoB4GdoGMzqsDg9Bub0FpI2/lnL5oeFgygRvYRBb78E3fUKuYIWcUjiZaTgukIsMtZKPEpv90tJXua5dQEOOip9D4SQddHoT7MNToFFKJ5pXzHonc8dSMQYLV3LeR1V/9inJhrRPjedhr1jdJBMLZIAOe/mZBDh8CQKBgQDJG7zPL0sua6WkX6lLX0JydmEjbOFedeL2olY3pm8Vj0iC1ejUzsYrRwHEc1YUr2bO0NQ0uQ64dLhl+AXu2HwCWu7aRKMas0lg4uFemcmerqUMd1ozJJfI3fhjfSaFXwSqn5LcclUCXt/LOx49cxN9HmPHYNpyvV+P17gchIG4zQKBgCL95+rBKcTE3G+fBz0Z4eXLS/fVuRiRUSeIFkW8k9/2cRYYaWOMYfLtM8pIrzov+gBdvfKZhC4A30qBBUpiaJWbYJR8LylDscSXJJeO8jtAmt/QpubmuvGsiUFRXwJ3wtXkrNAHMm4dunzLBn3N5n5WwJ/E3PvI+F+9vV9zds9hAoGAdz5eHo8RSe4EIkmibRGHqaztff7SRpspv0mUS50A4sy5lvJVAtG0CPcqYhxtHwi9scV6/eP4iYCT0cpVYkC0jwTx+TOXbn599Nex/9C6Dr/JF3IxZn+9DBopbHxJee1ULANAJjwYkbZFhhCAprj0Bk0dppuUC1KkNfsXrLkY3cUCgYAYdRxY9KFg97jhRyD25LKTHbLyp5+rd53UxxNM5GGaxwHCe0FPj9jTD9x6NoGIg1cLDeaTIy20a4cDJx5v50yrMFvnbIMCcQ4nm71GfXUtO53O/k4ptTk9jVlM8ymJ/kK0956OODrrCTz/4Sur4+11gkd1LAw+MfKHZ8gtWrswPQ=="; //process.env.PAYU_MERCHANT_SALT;
const PAYU_BASE_URL = 'https://test.payu.in'; // process.env.PAYU_BASE_URL||'https://secure.payu.in';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://plumeriaretreat.vercel.app';
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL || 'https://adminplumeria-back.onrender.com';

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
      console.log(`Marked ${result.affectedRows} bookings as expired`);
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

    const requiredFields = ['guest_name', 'accommodation_id', 'package_id', 'check_in', 'check_out', 'total_amount'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    const totalGuests = adults + children;
    const totalFood = food_veg + food_nonveg + food_jain;
    if (totalFood !== totalGuests) {
      return res.status(400).json({ success: false, error: 'Food preferences must match total guests' });
    }

    if (new Date(check_in) >= new Date(check_out)) {
      return res.status(400).json({ success: false, error: 'Check-out must be after check-in' });
    }

    if (total_amount <= 0 || advance_amount < 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount values' });
    }

    if (adults < 1 || rooms < 1) {
      return res.status(400).json({ success: false, error: 'Must have at least 1 adult and 1 room' });
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
        guest_name, guest_email, guest_phone || null, accommodation_id, package_id,
        check_in, check_out, adults, children, rooms, food_veg, food_nonveg,
        food_jain, total_amount, advance_amount, payment_status, payment_txn_id, new Date()
      ]
    );

    await connection.commit();

    res.json({ success: true, data: { booking_id: result.insertId, payment_txn_id, payment_status } });

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

// POST /admin/bookings/payments/payu - Initiate PayU payment (UPDATED)
router.post('/payments/payu', async (req, res) => {
  try {
    const { amount, firstname, email, phone, booking_id, productinfo } = req.body;

    if (!amount || !firstname || !email || !booking_id || !productinfo) {
      return res.status(400).json({ success: false, error: 'Missing required payment parameters' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const cleanPhone = phone ? phone.toString().replace(/\D/g, '') : '';
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone required' });
    }

    const [booking] = await pool.execute(
      'SELECT id FROM bookings WHERE id = ? AND payment_status = "pending"', [booking_id]
    );
    if (booking.length === 0) {
      return res.status(404).json({ success: false, error: 'Pending booking not found' });
    }

    const txnid = `PAYU-${uuidv4()}`;
    const udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '';
    const truncatedProductinfo = productinfo.substring(0, 100);
    const truncatedFirstname = firstname.substring(0, 60);
    const truncatedEmail = email.substring(0, 50);

    const hashString = `${payu_key}|${txnid}|${amount}|${truncatedProductinfo}|${truncatedFirstname}|${truncatedEmail}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${payu_salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    await pool.execute('UPDATE bookings SET payment_txn_id = ?, payment_status = "pending" WHERE id = ?', [txnid, booking_id]);

    // POINT TO BACKEND VERIFICATION ENDPOINT (UPDATED)
    const paymentData = {
      key: payu_key,
      txnid,
      amount,
      productinfo: truncatedProductinfo,
      firstname: truncatedFirstname,
      email: truncatedEmail,
      phone: cleanPhone.substring(0, 10),
      surl: `https://a.plumeriaretreat.com/admin/bookings/verify/${txnid}`, // Backend endpoint
      furl: `https://a.plumeriaretreat.com/admin/bookings/verify/${txnid}`, // Backend endpoint
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
    res.status(500).json({ success: false, error: 'Payment initiation failed' });
  }
});

// // GET /payment-status/:txnid - Check payment status
// router.get('/payment-status/:txnid', async (req, res) => {
//   try {
//     const { txnid } = req.params;
//     const { force_payu } = req.query;

//     if (!txnid) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Transaction ID is required' 
//       });
//     }

//     const [bookings] = await pool.execute(
//       'SELECT id, payment_status, payment_txn_id, total_amount, advance_amount, created_at FROM bookings WHERE payment_txn_id = ?',
//       [txnid]
//     );

//     if (bookings.length === 0) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Transaction not found' 
//       });
//     }

//     const booking = bookings[0];

//     const shouldCheckPayU = force_payu === 'true' || 
//                            booking.payment_status === 'failed' || 
//                            booking.payment_status === 'pending';

//     if (!shouldCheckPayU && booking.payment_status === 'success') {
//       return res.json({
//         success: true,
//         data: {
//           txnid,
//           status: booking.payment_status,
//           source: 'database',
//           booking_id: booking.id,
//           amount: booking.advance_amount || booking.total_amount,
//           message: 'Payment already confirmed as successful'
//         }
//       });
//     }

//     try {
//       const payuClient = new PayU({ key: payu_key, salt: payu_salt });
//       const verifiedData = await payuClient.verifyPayment(txnid);

//       if (!verifiedData || !verifiedData.transaction_details || !verifiedData.transaction_details[txnid]) {
//         return res.json({
//           success: true,
//           data: {
//             txnid,
//             status: booking.payment_status,
//             source: 'database',
//             booking_id: booking.id,
//             amount: booking.advance_amount || booking.total_amount,
//             warning: 'PayU verification returned no data - check merchant dashboard manually',
//             payu_response: verifiedData
//           }
//         });
//       }

//       const transaction = verifiedData.transaction_details[txnid];
//       let finalStatus = 'pending';
//       if (transaction.status === 'success') {
//         finalStatus = 'success';
//       } else if (transaction.status === 'failure' || transaction.status === 'failed') {
//         finalStatus = 'failed';
//       }

//       if (finalStatus !== booking.payment_status) {
//         await pool.execute(
//           'UPDATE bookings SET payment_status = ? WHERE payment_txn_id = ?',
//           [finalStatus, txnid]
//         );
//       }

//       return res.json({
//         success: true,
//         data: {
//           txnid,
//           status: finalStatus,
//           source: 'payu',
//           booking_id: booking.id,
//           amount: transaction.amount || booking.advance_amount || booking.total_amount,
//           payment_id: transaction.mihpayid,
//           payment_mode: transaction.mode,
//           bank_ref_num: transaction.bank_ref_num,
//           payu_status: transaction.status,
//           status_updated: finalStatus !== booking.payment_status,
//           original_db_status: booking.payment_status
//         }
//       });

//     } catch (payuError) {
//       return res.json({
//         success: true,
//         data: {
//           txnid,
//           status: booking.payment_status,
//           source: 'database',
//           booking_id: booking.id,
//           amount: booking.advance_amount || booking.total_amount,
//           error: 'PayU verification failed',
//           error_details: payuError.message,
//           recommendation: 'Check PayU merchant dashboard manually'
//         }
//       });
//     }

//   } catch (error) {
//     console.error('Error checking payment status:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to check payment status',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// POST /verify/:txnid - Handle PayU callback (UPDATED)
async function sendPdfEmail(email) {
  console.log('Sending PDF email to:', email);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const html = `
    <html>
      <body>
        <h1>Hello from Puppeteer</h1>
        <p>This PDF was generated using modern libraries.</p>
      </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  // Nodemailer setup
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',//smtp,
    secure: true,
    port: 465,
    auth: {
      user: "chandan56348@gmail.com",   // set in Render dashboard
      pass: "mshnxdgdedgdacyy"
    }
  });

  const mailOptions = {
    from: "chandan56348@gmail.com",
    to: email,
    subject: 'PDF generated with Puppeteer',
    text: 'Attached is a PDF created using Puppeteer.',
    attachments: [
      {
        filename: 'modern-pdf.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]

  };
  console.log('Mail options:', mailOptions);
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return console.error('Mail send error:', err);
    console.log('Email sent:', info.response);
  });
}

router.post('/verify/:txnid', async (req, res) => {
  console.log('Payment verification callback received');
  const { txnid } = req.params;

  //find email base on txnid
  try {
    const payuClient = new PayU({ key: payu_key, salt: payu_salt });
    const verifiedData = await payuClient.verifyPayment(txnid);

    if (!verifiedData?.transaction_details?.[txnid]) {
      console.error('Transaction details missing');
      return res.redirect(`${FRONTEND_BASE_URL}/payment/failed/${txnid}`);
    }
    const [booking] = await pool.execute(
      'SELECT guest_email FROM bookings WHERE payment_txn_id = ?',
      [txnid]
    );
    if (booking.length === 0) {
      console.error('Booking not found for txnid:', txnid);
      return res.redirect(`${FRONTEND_BASE_URL}/payment/failed/${txnid}`);
    }
    const guestEmail = booking[0].guest_email;
    console.log('Guest email found:', guestEmail);
    if (!guestEmail) {
      console.error('Guest email not found for txnid:', txnid);
      return res.redirect(`${FRONTEND_BASE_URL}/payment/failed/${txnid}`);
    }
    const transaction = verifiedData.transaction_details[txnid];
    const newStatus = transaction.status === "success" ? "success" : "failed";

    await pool.execute(
      'UPDATE bookings SET payment_status = ? WHERE payment_txn_id = ?',
      [newStatus, txnid]
    );

    if (newStatus === "success") {
      // Send confirmation email to user
      console.log('Payment successful, sending confirmation email');
      sendPdfEmail(guestEmail); // Call the function to send PDF email

    }
    console.log(`Payment ${newStatus} for txnid: ${txnid}`);

    // Redirect to frontend with GET parameters
    res.redirect(`${FRONTEND_BASE_URL}/payment/${newStatus}/${txnid}`);

  } catch (error) {
    console.error('Verification error:', error);
    res.redirect(`${FRONTEND_BASE_URL}/payment/failed/${txnid}`);
  }
});

// PUT /admin/bookings/:id/status - Manually update payment status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({ success: false, error: 'Payment status is required' });
    }

    const validStatuses = ['pending', 'success', 'failed', 'expired'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ success: false, error: 'Invalid payment status' });
    }

    const [result] = await pool.execute('UPDATE bookings SET payment_status = ? WHERE id = ?', [payment_status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({ success: true, message: 'Payment status updated' });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, error: 'Failed to update payment status' });
  }
});

module.exports = router;