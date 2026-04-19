const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.post('/orders/:id/review', verifyToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { rating, content } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ code: 400, msg: '评分为1-5整数' });
    }
    if (!content || content.length < 2 || content.length > 500) {
      return res.status(400).json({ code: 400, msg: '评价内容2-500字符' });
    }

    const orders = await query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, msg: '订单不存在' });
    }

    const ord = orders[0];
    if (ord.status !== 'completed') {
      return res.status(400).json({ code: 400, msg: '订单未完成，无法评价' });
    }

    if (ord.buyer_id !== userId && ord.seller_id !== userId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    const existing = await query(
      'SELECT id FROM reviews WHERE order_id = ? AND reviewer_id = ?',
      [orderId, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ code: 409, msg: '已评价过该订单' });
    }

    let targetId;
    if (ord.buyer_id === userId) {
      targetId = ord.seller_id;
    } else {
      targetId = ord.buyer_id;
    }

    await query(
      'INSERT INTO reviews (order_id, reviewer_id, target_id, rating, content) VALUES (?, ?, ?, ?, ?)',
      [orderId, userId, targetId, rating, content]
    );

    res.status(200).json({ code: 200, msg: '评价成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/user/:id/reviews', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const reviews = await query(
      `SELECT r.*, u.nickname as reviewer_nickname, u.avatar as reviewer_avatar 
       FROM reviews r 
       JOIN users u ON r.reviewer_id = u.id 
       WHERE r.target_id = ? 
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const data = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      created_at: r.created_at,
      reviewer: { nickname: r.reviewer_nickname, avatar: r.reviewer_avatar }
    }));

    res.status(200).json({ code: 200, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/user/:id/rating', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const result = await query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE target_id = ?',
      [userId]
    );

    const avgRating = result[0].avg_rating ? parseFloat(result[0].avg_rating).toFixed(1) : 0;
    const totalReviews = result[0].total_reviews || 0;

    res.status(200).json({
      code: 200,
      data: { average_rating: parseFloat(avgRating), total_reviews: parseInt(totalReviews) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;