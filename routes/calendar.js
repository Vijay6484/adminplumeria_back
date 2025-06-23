const express = require('express');
const router = express.Router();
const pool = require('../dbcon');

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
        a.title AS accommodation_name,
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

// POST /admin/calendar/blocked-dates
router.post('/blocked-dates', async (req, res) => {
  try {
    const { dates, reason, accommodation_id, adult_price, child_price } = req.body;
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, message: 'No dates provided' });
    }
    for (const date of dates) {
      await pool.execute(
        `INSERT INTO blocked_dates (blocked_date, reason, accommodation_id, adult_price, child_price)
         VALUES (?, ?, ?, ?, ?)`,
        [date, reason, accommodation_id, adult_price, child_price]
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
    const { reason, accommodation_id, adult_price, child_price } = req.body;
    await pool.execute(
      `UPDATE blocked_dates SET reason=?, accommodation_id=?, adult_price=?, child_price=? WHERE id=?`,
      [reason, accommodation_id, adult_price, child_price, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating blocked date:', error);
    res.status(500).json({ success: false, message: 'Failed to update blocked date' });
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