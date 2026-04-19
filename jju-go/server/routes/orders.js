const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
  try {
    const { goods_id } = req.body;
    const buyerId = req.user.id;

    if (!goods_id || isNaN(parseInt(goods_id))) {
      return res.status(400).json({ code: 400, msg: '无效的商品ID' });
    }

    const goodsId = parseInt(goods_id);
    const goods = await query(
      'SELECT id, seller_id, price, status FROM goods WHERE id = ?',
      [goodsId]
    );

    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    const g = goods[0];
    if (g.status !== 'approved') {
      return res.status(400).json({ code: 400, msg: '商品已下架或已售出' });
    }

    if (g.seller_id === buyerId) {
      return res.status(400).json({ code: 400, msg: '不能购买自己的商品' });
    }

    const existingOrders = await query(
      `SELECT id FROM orders WHERE goods_id = ? AND status IN ('pending_pay', 'pending_verify')`,
      [goodsId]
    );

    if (existingOrders.length > 0) {
      return res.status(409).json({ code: 409, msg: '该商品已被下单，请等待交易完成' });
    }

    const result = await query(
      'INSERT INTO orders (goods_id, buyer_id, seller_id, amount, status) VALUES (?, ?, ?, ?, ?)',
      [goodsId, buyerId, g.seller_id, g.price, 'pending_pay']
    );

    res.status(200).json({
      code: 200,
      msg: '下单成功',
      data: { id: result.insertId, status: 'pending_pay', amount: g.price }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/:id/pay', verifyToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const buyerId = req.user.id;

    const orders = await query(
      'SELECT id, buyer_id, status FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, msg: '订单不存在' });
    }

    const ord = orders[0];
    if (ord.buyer_id !== buyerId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    if (ord.status !== 'pending_pay') {
      return res.status(400).json({ code: 400, msg: '订单状态不正确' });
    }

    const tradeCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      'UPDATE orders SET status = ?, trade_code = ?, trade_code_expire = ? WHERE id = ?',
      ['pending_verify', tradeCode, expireTime, orderId]
    );

    res.status(200).json({
      code: 200,
      msg: '支付成功',
      data: { trade_code: tradeCode, expire_time: expireTime }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/:id/verify', verifyToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { trade_code } = req.body;
    const userId = req.user.id;

    if (!trade_code) {
      return res.status(400).json({ code: 400, msg: '请输入交易码' });
    }

    const orders = await query(
      'SELECT o.*, g.id as goods_id, g.status as goods_status FROM orders o JOIN goods g ON o.goods_id = g.id WHERE o.id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, msg: '订单不存在' });
    }

    const ord = orders[0];
    if (ord.buyer_id !== userId && ord.seller_id !== userId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    if (ord.status !== 'pending_verify') {
      return res.status(400).json({ code: 400, msg: '订单状态不正确' });
    }

    const now = new Date();
    if (now > new Date(ord.trade_code_expire)) {
      const newCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const newExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await query(
        'UPDATE orders SET trade_code = ?, trade_code_expire = ? WHERE id = ?',
        [newCode, newExpire, orderId]
      );
      return res.status(410).json({
        code: 410,
        msg: '交易码已过期，已重新生成，请刷新查看',
        data: { new_trade_code: newCode }
      });
    }

    if (ord.trade_code !== trade_code) {
      return res.status(400).json({ code: 400, msg: '交易码错误' });
    }

    await query('UPDATE orders SET status = ?, completed_at = ? WHERE id = ?', ['completed', now, orderId]);
    await query('UPDATE goods SET status = ? WHERE id = ?', ['sold', ord.goods_id]);

    res.status(200).json({ code: 200, msg: '交易核验成功，订单已完成' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/:id/complete', verifyToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.id;

    const orders = await query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, msg: '订单不存在' });
    }

    const ord = orders[0];
    if (ord.buyer_id !== userId && ord.seller_id !== userId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    if (ord.status !== 'pending_verify') {
      return res.status(400).json({ code: 400, msg: '订单状态不正确' });
    }

    const now = new Date();
    await query('UPDATE orders SET status = ?, completed_at = ? WHERE id = ?', ['completed', now, orderId]);
    await query('UPDATE goods SET status = ? WHERE id = ?', ['sold', ord.goods_id]);

    res.status(200).json({ code: 200, msg: '订单已完成' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/buyer', verifyToken, async (req, res) => {
  try {
    const buyerId = req.user.id;

    const orders = await query(
      `SELECT o.*, g.title, g.price as goods_price, g.pics 
       FROM orders o 
       JOIN goods g ON o.goods_id = g.id 
       WHERE o.buyer_id = ? 
       ORDER BY o.created_at DESC`,
      [buyerId]
    );

    const data = orders.map(o => ({
      id: o.id,
      status: o.status,
      amount: o.amount,
      created_at: o.created_at,
      completed_at: o.completed_at,
      goods: { title: o.title, price: o.goods_price, pics: JSON.parse(o.pics || '[]') }
    }));

    res.status(200).json({ code: 200, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/seller', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.id;

    const orders = await query(
      `SELECT o.*, g.title, g.price as goods_price, g.pics 
       FROM orders o 
       JOIN goods g ON o.goods_id = g.id 
       WHERE o.seller_id = ? 
       ORDER BY o.created_at DESC`,
      [sellerId]
    );

    const data = orders.map(o => ({
      id: o.id,
      status: o.status,
      amount: o.amount,
      created_at: o.created_at,
      completed_at: o.completed_at,
      goods: { title: o.title, price: o.goods_price, pics: JSON.parse(o.pics || '[]') }
    }));

    res.status(200).json({ code: 200, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.id;

    const orders = await query(
      `SELECT o.*, 
       gb.nickname as buyer_nickname, gb.avatar as buyer_avatar,
       gs.nickname as seller_nickname, gs.avatar as seller_avatar,
       g.title, g.description, g.price as goods_price, g.pics
       FROM orders o 
       JOIN goods g ON o.goods_id = g.id
       JOIN users gb ON o.buyer_id = gb.id
       JOIN users gs ON o.seller_id = gs.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, msg: '订单不存在' });
    }

    const ord = orders[0];
    if (ord.buyer_id !== userId && ord.seller_id !== userId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    res.status(200).json({
      code: 200,
      data: {
        id: ord.id,
        status: ord.status,
        amount: ord.amount,
        trade_code: ord.trade_code,
        trade_code_expire: ord.trade_code_expire,
        created_at: ord.created_at,
        completed_at: ord.completed_at,
        goods: {
          title: ord.title,
          description: ord.description,
          price: ord.goods_price,
          pics: JSON.parse(ord.pics || '[]')
        },
        buyer: { id: ord.buyer_id, nickname: ord.buyer_nickname, avatar: ord.buyer_avatar },
        seller: { id: ord.seller_id, nickname: ord.seller_nickname, avatar: ord.seller_avatar }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;