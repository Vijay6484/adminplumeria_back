const express = require('express');
const router = express.Router();
const pool = require('../dbcon');
const cron = require('node-cron');

cron.schedule('0 2 * * *', async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // midnight today

    const [result] = await pool.execute(
      `DELETE FROM blocked_dates WHERE blocked_date < ?`,
      [today]
    );

    console.log(`[CRON] Deleted ${result.affectedRows} expired blocked_dates`);
  } catch (err) {
    console.error('[CRON] Error deleting past blocked dates:', err);
  }
});

// GET /admin/calendar/blocked-dates
router.get('/blocked-dates', async (req, res) => {
  console.log('Fetching blocked dates');
  try {
    const [rows] = await pool.execute(`
      SELECT 
        bd.id, 
        bd.blocked_date, 
        bd.reason, 
        bd.accommodation_id, 
        bd.rooms,  // Changed to rooms
        a.name AS accommodation_name,
        bd.adult_price,
        bd.child_price
      FROM blocked_dates bd
      LEFT JOIN accommodations a ON bd.accommodation_id = a.id
      ORDER BY bd.blocked_date DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blocked dates' });
  }
});

router.get('/blocked-dates/id', async (req, res) => {
  const { accommodation_id } = req.query;
  console.log('Fetching blocked dates for accommodation_id:', accommodation_id);

  try {
    let query = `
      SELECT 
        bd.id, 
        bd.blocked_date, 
        bd.reason, 
        bd.accommodation_id, 
        bd.rooms,  // Changed to rooms
        a.name AS accommodation_name,
        bd.adult_price,
        bd.child_price
      FROM blocked_dates bd
      LEFT JOIN accommodations a ON bd.accommodation_id = a.id
    `;

    const params = [];

    if (accommodation_id) {
      query += ` WHERE bd.accommodation_id = ?`;
      params.push(accommodation_id);
    }

    query += ` ORDER BY bd.blocked_date DESC`;

    const [rows] = await pool.execute(query, params);

    res.json({ success: true, data: rows });

  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blocked dates' });
  }
});

// POST /admin/calendar/blocked-dates
router.post('/blocked-dates', async (req, res) => {
  try {
    const { dates, reason, accommodation_id, room_number, adult_price, child_price } = req.body;
    
    console.log('Blocking dates:', { 
      dates, 
      reason, 
      accommodation_id, 
      room_number,
      adult_price, 
      child_price 
    });
    
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, message: 'No dates provided' });
    }
    
    for (const date of dates) {
      await pool.execute(
        // Changed room_number to rooms in query
        `INSERT INTO blocked_dates (blocked_date, reason, accommodation_id, rooms, adult_price, child_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [date, reason, accommodation_id, room_number, adult_price, child_price]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error blocking dates:', error);
    res.status(500).json({ success: false, message: 'Failed to block dates' });
  }
});

// PUT /admin/calendar/blocked-dates/:id
router.put('/blocked-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, accommodation_id, room_number, adult_price, child_price } = req.body;
    
    await pool.execute(
      // Changed room_number to rooms in query
      `UPDATE blocked_dates 
       SET reason=?, accommodation_id=?, rooms=?, adult_price=?, child_price=?
       WHERE id=?`,
      [reason, accommodation_id, room_number, adult_price, child_price, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating blocked date:', error);
    res.status(500).json({ success: false, message: 'Failed to update blocked date' });
  }
});

router.delete('/blocked-dates/cleanup', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight (start of today)

    const [result] = await pool.execute(
      `DELETE FROM blocked_dates WHERE blocked_date < ?`,
      [today]
    );

    res.json({
      success: true,
      message: `${result.affectedRows} past blocked date(s) deleted.`,
    });
  } catch (error) {
    console.error('Error deleting past blocked dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete past blocked dates.',
    });
  }
});

// DELETE /admin/calendar/blocked-dates/:id
router.delete('/blocked-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM blocked_dates WHERE id=?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blocked date:', error);
    res.status(500).json({ success: false, message: 'Failed to delete blocked date' });
  }
});

// GET /admin/calendar/accommodations
router.get('/accommodations', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, title AS name, type FROM accommodations');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accommodations' });
  }
});

module.exports = router;