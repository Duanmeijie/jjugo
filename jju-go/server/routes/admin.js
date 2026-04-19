const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const [users, goods, orders, todayOrders] = await Promise.all([
      query('SELECT COUNT(*) as total FROM users'),
      query('SELECT COUNT(*) as total FROM goods'),
      query('SELECT COUNT(*) as total FROM orders'),
      query('SELECT COUNT(*) as total FROM orders WHERE DATE(created_at) = CURDATE()')
    ]);

    res.status(200).json({
      code: 200,
      data: {
        total_users: users[0].total,
        total_goods: goods[0].total,
        total_orders: orders[0].total,
        today_orders: todayOrders[0].total
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    const [users, countResult] = await Promise.all([
      query('SELECT id, student_id, phone, nickname, role, status, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?', [limitNum, offset]),
      query('SELECT COUNT(*) as total FROM users')
    ]);

    res.status(200).json({
      code: 200,
      data: { list: users, total: countResult[0].total }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.put('/users/:id/status', verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ code: 400, msg: '无效的状态' });
    }

    await query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
    res.status(200).json({ code: 200, msg: '操作成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/goods', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT g.*, u.nickname as seller_nickname FROM goods g 
              LEFT JOIN users u ON g.seller_id = u.id`;
    let countSql = 'SELECT COUNT(*) as total FROM goods';
    const params = [];
    const countParams = [];

    if (status) {
      sql += ' WHERE g.status = ?';
      countSql += ' WHERE status = ?';
      params.push(status);
      countParams.push(status);
    }

    sql += ' ORDER BY g.id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [goods, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams)
    ]);

    res.status(200).json({
      code: 200,
      data: { list: goods, total: countResult[0].total }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.put('/goods/:id/status', verifyAdmin, async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['approved', 'rejected', 'sold'].includes(status)) {
      return res.status(400).json({ code: 400, msg: '无效的状态' });
    }

    await query('UPDATE goods SET status = ? WHERE id = ?', [status, goodsId]);
    res.status(200).json({ code: 200, msg: '操作成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/orders', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT o.*, g.title as goods_title, 
              buyer.nickname as buyer_nickname, seller.nickname as seller_nickname 
              FROM orders o 
              LEFT JOIN goods g ON o.goods_id = g.id
              LEFT JOIN users buyer ON o.buyer_id = buyer.id
              LEFT JOIN users seller ON o.seller_id = seller.id`;
    let countSql = 'SELECT COUNT(*) as total FROM orders';
    const params = [];
    const countParams = [];

    if (status) {
      sql += ' WHERE o.status = ?';
      countSql += ' WHERE status = ?';
      params.push(status);
      countParams.push(status);
    }

    sql += ' ORDER BY o.id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [orders, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams)
    ]);

    res.status(200).json({
      code: 200,
      data: { list: orders, total: countResult[0].total }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/sensitive-words', verifyAdmin, async (req, res) => {
  try {
    const words = await query('SELECT * FROM sensitive_words ORDER BY id');
    res.status(200).json({ code: 200, data: words });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/sensitive-words', verifyAdmin, async (req, res) => {
  try {
    const { word, level = 1 } = req.body;

    if (!word) {
      return res.status(400).json({ code: 400, msg: '请输入敏感词' });
    }

    await query('INSERT INTO sensitive_words (word, level) VALUES (?, ?)', [word, level]);
    res.status(200).json({ code: 200, msg: '添加成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.delete('/sensitive-words/:id', verifyAdmin, async (req, res) => {
  try {
    const wordId = parseInt(req.params.id);
    await query('DELETE FROM sensitive_words WHERE id = ?', [wordId]);
    res.status(200).json({ code: 200, msg: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;