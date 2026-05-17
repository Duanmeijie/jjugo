const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { createNotification, TYPES } = require('./notifications');

const STATUS_MAP = {
  CART: 'cart',
  PENDING_PAYMENT: 'pending_payment',
  PENDING_DELIVERY: 'pending_delivery',
  PENDING_REVIEW: 'pending_review',
  AFTER_SALE: 'after_sale',
  HISTORY: 'history',
  CANCELLED: 'cancelled'
};

const checkAndUpdateExpiredOrders = async (userId) => {
  const now = new Date();
  
  const pendingPaymentOrders = await query(
    'SELECT id, payment_deadline FROM orders WHERE buyer_id = ? AND status = ?',
    [userId, STATUS_MAP.PENDING_PAYMENT]
  );
  
  for (const order of pendingPaymentOrders) {
    if (order.payment_deadline && new Date(order.payment_deadline) < now) {
      await query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [STATUS_MAP.CART, order.id]
      );
      try {
        await query(
          'UPDATE goods SET status = ? WHERE id = (SELECT goods_id FROM orders WHERE id = ?)',
          ['selling', order.id]
        );
      } catch (e) {
        console.log('恢复商品状态失败，使用 approved', e.message);
        await query(
          'UPDATE goods SET status = ? WHERE id = (SELECT goods_id FROM orders WHERE id = ?)',
          ['approved', order.id]
        );
      }
    }
  }
  
  const pendingDeliveryOrders = await query(
    'SELECT id, delivery_deadline FROM orders WHERE (buyer_id = ? OR seller_id = ?) AND status = ?',
    [userId, userId, STATUS_MAP.PENDING_DELIVERY]
  );
  
  for (const order of pendingDeliveryOrders) {
    if (order.delivery_deadline && new Date(order.delivery_deadline) < now) {
      const [orderData] = await query('SELECT goods_id FROM orders WHERE id = ?', [order.id]);
      await query('UPDATE orders SET status = ? WHERE id = ?', [STATUS_MAP.CART, order.id]);
      if (orderData) {
        try {
          await query('UPDATE goods SET status = ? WHERE id = ?', ['selling', orderData.goods_id]);
        } catch (e) {
          console.log('恢复商品状态失败，使用 approved', e.message);
          await query('UPDATE goods SET status = ? WHERE id = ?', ['approved', orderData.goods_id]);
        }
      }
    }
  }
  
  const pendingReviewOrders = await query(
    'SELECT id, review_deadline FROM orders WHERE (buyer_id = ? OR seller_id = ?) AND status = ?',
    [userId, userId, STATUS_MAP.PENDING_REVIEW]
  );
  
  for (const order of pendingReviewOrders) {
    if (order.review_deadline && new Date(order.review_deadline) < now) {
      await query('UPDATE orders SET status = ? WHERE id = ?', [STATUS_MAP.AFTER_SALE, order.id]);
    }
  }
};

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
    const validStatuses = ['selling', 'approved', 'pending'];
    if (!validStatuses.includes(g.status)) {
      return res.status(400).json({ code: 400, msg: '商品已下架或已售出' });
    }

    if (g.seller_id === buyerId) {
      return res.status(400).json({ code: 400, msg: '不能购买自己的商品' });
    }

    const existingOrders = await query(
      `SELECT id FROM orders WHERE goods_id = ? AND status IN (?, ?, ?, ?)`,
      [goodsId, STATUS_MAP.PENDING_PAYMENT, STATUS_MAP.PENDING_DELIVERY, STATUS_MAP.PENDING_REVIEW, STATUS_MAP.AFTER_SALE]
    );

    if (existingOrders.length > 0) {
      return res.status(409).json({ code: 409, msg: '该商品已被下单，请等待交易完成' });
    }

    const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await query(
      'INSERT INTO orders (goods_id, buyer_id, seller_id, amount, status, payment_deadline) VALUES (?, ?, ?, ?, ?, ?)',
      [goodsId, buyerId, g.seller_id, g.price, STATUS_MAP.PENDING_PAYMENT, paymentDeadline]
    );

    try {
      await query('UPDATE goods SET status = ? WHERE id = ?', ['sold_pending', goodsId]);
    } catch (updateErr) {
      console.log('更新状态为 sold_pending 失败，尝试更新为 sold', updateErr.message);
      await query('UPDATE goods SET status = ? WHERE id = ?', ['sold', goodsId]);
    }

    await createNotification(
        g.seller_id,
        TYPES.ORDER_CREATED,
        '新订单通知',
        `您的商品有新的订单，请及时处理`,
        result.insertId
    );

    res.status(200).json({
      code: 200,
      msg: '下单成功',
      data: { id: result.insertId, status: STATUS_MAP.PENDING_PAYMENT, amount: g.price, payment_deadline: paymentDeadline }
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
      'SELECT id, buyer_id, status, payment_deadline FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, msg: '订单不存在' });
    }

    const ord = orders[0];
    if (ord.buyer_id !== buyerId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    if (ord.status !== STATUS_MAP.PENDING_PAYMENT) {
      return res.status(400).json({ code: 400, msg: '订单状态不正确' });
    }

    if (ord.payment_deadline && new Date(ord.payment_deadline) < new Date()) {
      await query('UPDATE orders SET status = ? WHERE id = ?', [STATUS_MAP.CART, orderId]);
      try {
        await query('UPDATE goods SET status = ? WHERE id = (SELECT goods_id FROM orders WHERE id = ?)', ['selling', orderId]);
      } catch (e) {
        console.log('恢复商品状态失败，使用 approved', e.message);
        await query('UPDATE goods SET status = ? WHERE id = (SELECT goods_id FROM orders WHERE id = ?)', ['approved', orderId]);
      }
      return res.status(400).json({ code: 400, msg: '付款已超时，订单已移入购物车' });
    }

    const tradeCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const deliveryDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await query(
      'UPDATE orders SET status = ?, trade_code = ?, trade_code_expire = ?, delivery_deadline = ? WHERE id = ?',
      [STATUS_MAP.PENDING_DELIVERY, tradeCode, expireTime, deliveryDeadline, orderId]
    );

    res.status(200).json({
      code: 200,
      msg: '支付成功',
      data: { trade_code: tradeCode, expire_time: expireTime, delivery_deadline: deliveryDeadline }
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

    if (ord.status !== STATUS_MAP.PENDING_DELIVERY) {
      return res.status(400).json({ code: 400, msg: '订单状态不正确' });
    }

    if (ord.delivery_deadline && new Date(ord.delivery_deadline) < new Date()) {
      await query('UPDATE orders SET status = ? WHERE id = ?', [STATUS_MAP.CANCELLED, orderId]);
      await query('UPDATE goods SET status = ? WHERE id = ?', ['selling', ord.goods_id]);
      return res.status(400).json({ code: 400, msg: '交易已超时，已自动取消并退款' });
    }

    const now = new Date();
    if (ord.trade_code_expire && new Date(ord.trade_code_expire) < now) {
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

    const reviewDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'UPDATE orders SET status = ?, completed_at = ?, review_deadline = ? WHERE id = ?',
      [STATUS_MAP.PENDING_REVIEW, now, reviewDeadline, orderId]
    );
    try {
      await query('UPDATE goods SET status = ? WHERE id = ?', ['sold_out', ord.goods_id]);
    } catch (e) {
      console.log('更新状态为 sold_out 失败，使用 sold', e.message);
      await query('UPDATE goods SET status = ? WHERE id = ?', ['sold', ord.goods_id]);
    }

    await createNotification(
        ord.buyer_id,
        TYPES.ORDER_COMPLETED,
        '交易完成通知',
        `您的订单已完成，请对卖家进行评价`,
        orderId
    );

    res.status(200).json({
      code: 200,
      msg: '交易核验成功',
      data: { status: STATUS_MAP.PENDING_REVIEW, review_deadline: reviewDeadline }
    });
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

    if (ord.status !== STATUS_MAP.PENDING_DELIVERY) {
      return res.status(400).json({ code: 400, msg: '订单状态不正确' });
    }

    if (ord.delivery_deadline && new Date(ord.delivery_deadline) < new Date()) {
      await query('UPDATE orders SET status = ? WHERE id = ?', [STATUS_MAP.CANCELLED, orderId]);
      await query('UPDATE goods SET status = ? WHERE id = ?', ['selling', ord.goods_id]);
      return res.status(400).json({ code: 400, msg: '交易已超时，已自动取消' });
    }

    const now = new Date();
    const reviewDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'UPDATE orders SET status = ?, completed_at = ?, review_deadline = ? WHERE id = ?',
      [STATUS_MAP.PENDING_REVIEW, now, reviewDeadline, orderId]
    );
    try {
      await query('UPDATE goods SET status = ? WHERE id = ?', ['sold_out', ord.goods_id]);
    } catch (e) {
      console.log('更新状态为 sold_out 失败，使用 sold', e.message);
      await query('UPDATE goods SET status = ? WHERE id = ?', ['sold', ord.goods_id]);
    }

    res.status(200).json({
      code: 200,
      msg: '订单已完成',
      data: { status: STATUS_MAP.PENDING_REVIEW }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/:id/review', verifyToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { rating, content } = req.body;
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

    if (ord.status !== STATUS_MAP.PENDING_REVIEW) {
      return res.status(400).json({ code: 400, msg: '订单状态不正确' });
    }

    const targetId = ord.buyer_id === userId ? ord.seller_id : ord.buyer_id;

    await query(
      'INSERT INTO reviews (order_id, reviewer_id, target_id, rating, content) VALUES (?, ?, ?, ?, ?)',
      [orderId, userId, targetId, rating || 5, content || '']
    );

    await query('UPDATE orders SET status = ? WHERE id = ?', [STATUS_MAP.AFTER_SALE, orderId]);

    res.status(200).json({ code: 200, msg: '评价成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/:id/cancel', verifyToken, async (req, res) => {
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

    if (ord.status !== STATUS_MAP.PENDING_PAYMENT && ord.status !== STATUS_MAP.PENDING_DELIVERY) {
      return res.status(400).json({ code: 400, msg: '当前状态不能取消' });
    }

    await query('UPDATE orders SET status = ? WHERE id = ?', [STATUS_MAP.CART, orderId]);
    try {
      await query('UPDATE goods SET status = ? WHERE id = ?', ['selling', ord.goods_id]);
    } catch (e) {
      console.log('恢复商品状态失败，使用 approved', e.message);
      await query('UPDATE goods SET status = ? WHERE id = ?', ['approved', ord.goods_id]);
    }

    res.status(200).json({ code: 200, msg: '订单已取消' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/buyer', verifyToken, async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { status } = req.query;

    await checkAndUpdateExpiredOrders(buyerId);

    let sql = `SELECT o.*, g.title, g.price as goods_price, g.pics, g.seller_id, g.seller_student_info
               FROM orders o 
               JOIN goods g ON o.goods_id = g.id 
               WHERE o.buyer_id = ?`;
    const params = [buyerId];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await query(sql, params);

    const data = orders.map(o => ({
      id: o.id,
      status: o.status,
      amount: o.amount,
      created_at: o.created_at,
      completed_at: o.completed_at,
      payment_deadline: o.payment_deadline,
      delivery_deadline: o.delivery_deadline,
      review_deadline: o.review_deadline,
      trade_code: o.trade_code,
      goods: {
        id: o.goods_id,
        title: o.title,
        price: o.goods_price,
        pics: JSON.parse(o.pics || '[]'),
        seller_id: o.seller_id,
        seller_student_info: JSON.parse(o.seller_student_info || '{}')
      }
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
    const { status } = req.query;

    await checkAndUpdateExpiredOrders(sellerId);

    let sql = `SELECT o.*, g.title, g.price as goods_price, g.pics, g.seller_student_info
               FROM orders o 
               JOIN goods g ON o.goods_id = g.id 
               WHERE o.seller_id = ?`;
    const params = [sellerId];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await query(sql, params);

    const data = orders.map(o => ({
      id: o.id,
      status: o.status,
      amount: o.amount,
      created_at: o.created_at,
      completed_at: o.completed_at,
      payment_deadline: o.payment_deadline,
      delivery_deadline: o.delivery_deadline,
      review_deadline: o.review_deadline,
      trade_code: o.trade_code,
      goods: {
        id: o.goods_id,
        title: o.title,
        price: o.goods_price,
        pics: JSON.parse(o.pics || '[]'),
        seller_student_info: JSON.parse(o.seller_student_info || '{}')
      }
    }));

    res.status(200).json({ code: 200, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/cart', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const cartOrders = await query(
      `SELECT o.*, g.title, g.price as goods_price, g.pics, g.seller_student_info, g.preferred_time_slots, g.preferred_location
       FROM orders o 
       JOIN goods g ON o.goods_id = g.id 
       WHERE o.buyer_id = ? AND o.status = ?
       ORDER BY o.created_at DESC`,
      [userId, STATUS_MAP.CART]
    );

    const data = cartOrders.map(o => ({
      id: o.id,
      status: o.status,
      amount: o.amount,
      created_at: o.created_at,
      goods: {
        id: o.goods_id,
        title: o.title,
        price: o.goods_price,
        pics: JSON.parse(o.pics || '[]'),
        seller_student_info: JSON.parse(o.seller_student_info || '{}'),
        preferred_time_slots: JSON.parse(o.preferred_time_slots || '[]'),
        preferred_location: o.preferred_location
      }
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
       gb.nickname as buyer_nickname, gb.avatar as buyer_avatar, gb.student_id as buyer_student_id,
       gs.nickname as seller_nickname, gs.avatar as seller_avatar, gs.student_id as seller_student_id,
       g.title, g.description, g.price as goods_price, g.pics, g.preferred_time_slots, g.preferred_location
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
        payment_deadline: ord.payment_deadline,
        delivery_deadline: ord.delivery_deadline,
        review_deadline: ord.review_deadline,
        created_at: ord.created_at,
        completed_at: ord.completed_at,
        goods: {
          title: ord.title,
          description: ord.description,
          price: ord.goods_price,
          pics: JSON.parse(ord.pics || '[]'),
          preferred_time_slots: JSON.parse(ord.preferred_time_slots || '[]'),
          preferred_location: ord.preferred_location
        },
        buyer: { id: ord.buyer_id, nickname: ord.buyer_nickname, avatar: ord.buyer_avatar, student_id: ord.buyer_student_id },
        seller: { id: ord.seller_id, nickname: ord.seller_nickname, avatar: ord.seller_avatar, student_id: ord.seller_student_id }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
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
    if (ord.buyer_id !== userId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    if (ord.status !== STATUS_MAP.CART && ord.status !== STATUS_MAP.CANCELLED) {
      return res.status(400).json({ code: 400, msg: '只能删除购物车或已取消的订单' });
    }

    await query('DELETE FROM orders WHERE id = ?', [orderId]);

    res.status(200).json({ code: 200, msg: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;