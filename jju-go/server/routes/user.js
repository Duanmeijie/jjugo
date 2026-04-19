const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.get('/favorites', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await query(
      `SELECT f.id as fav_id, g.id, g.title, g.price, g.pics, g.created_at 
       FROM favorites f 
       JOIN goods g ON f.goods_id = g.id 
       WHERE f.user_id = ? AND g.status = 'approved' 
       ORDER BY f.created_at DESC`,
      [userId]
    );

    const data = favorites.map(f => ({
      id: f.id,
      title: f.title,
      price: f.price,
      pics: JSON.parse(f.pics || '[]'),
      created_at: f.created_at,
      fav_id: f.fav_id
    }));

    res.status(200).json({ code: 200, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;