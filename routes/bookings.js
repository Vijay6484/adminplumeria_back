const express = require('express');
const router = express.Router();
const pool = require('../dbcon');
const crypto = require('crypto');

// GET /admin/bookings - fetch all bookings
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        b.id,
        b.id AS bookingId,
        b.guest_name AS guest,
        b.guest_email AS email,
        b.guest_phone AS phone,
        b.food_veg AS veg,
        b.food_nonveg AS nonVeg,
        b.food_jain As jainCount,
        a.title AS accommodation,
        b.check_in AS checkIn,
        b.check_out AS checkOut,
        (b.adults + b.children) AS guests,
        b.adults,
        b.children,
        b.rooms,
        b.total_amount AS amount,
        b.advance_amount AS paidAmount,
        CASE 
          WHEN b.payment_status = 'success' THEN 'Paid'
          WHEN b.payment_status = 'partial' THEN 'Partial'
          ELSE 'Unpaid'
        END AS paymentStatus,
        'Confirmed' AS bookingStatus -- You can adjust this logic as needed
      FROM bookings b
      LEFT JOIN accommodations a ON b.accommodation_id = a.id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// POST /admin/bookings - create a new bookings
router.post('/', async (req, res) => {
  try {
    const {
      guestName, email, phone, accommodationId, checkIn, checkOut,
      adults, children, rooms, mealPlanId, vegCount, nonVegCount, jainCount,
      totalAmount, paymentAmount, paymentType, paymentMethod, couponId, transactionId, notes
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO bookings 
      (guest_name, guest_email, guest_phone, accommodation_id, check_in, check_out, adults, children, rooms, meal_plan_id, food_veg, food_nonveg, food_jain, total_amount, advance_amount, payment_type, payment_method, coupon_id, transaction_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guestName, email, phone, accommodationId, checkIn, checkOut, adults, children, rooms,
        mealPlanId, vegCount, nonVegCount, jainCount, totalAmount, paymentAmount, paymentType,
        paymentMethod, couponId, transactionId, notes
      ]
    );

    res.json({ success: true, booking_id: result.insertId });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
});

// POST /admin/bookings/payments/payu
router.post('/payments/payu', async (req, res) => {
  const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY || 'rFrruE9E';
  const PAYU_MERCHANT_SALT = process.env.PAYU_MERCHANT_SALT || 'DvYeVsKfYU';
  const PAYU_BASE_URL = process.env.PAYU_BASE_URL || 'https://secure.payu.in/_payment';

  const {
    amount,
    firstname,
    email,
    phone,
    productinfo,
    surl,
    furl,
    booking_id
  } = req.body;

  // Generate txnid
  const txnid = 'TXN' + Date.now();

  // Prepare hash string as per PayU docs
  const hashString = [
    PAYU_MERCHANT_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    '', '', '', '', '', '', '', '', '', // udf1-udf10 (empty except udf1 for booking_id)
    PAYU_MERCHANT_SALT
  ].join('|');

  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  const payuData = {
    key: PAYU_MERCHANT_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    surl,
    furl,
    hash,
    service_provider: 'payu_paisa',
    udf1: booking_id
  };

  res.json({
    payu_url: PAYU_BASE_URL,
    payuData
  });
});

module.exports = router;
