const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { upload, processImages } = require('../utils/upload');
const { check: sensitiveCheck } = require('../utils/sensitiveFilter');

const GOODS_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  SELLING: 'selling',
  SOLD_PENDING: 'sold_pending',
  SOLD_OUT: 'sold_out',
  REJECTED: 'rejected',
  SOLD: 'sold'
};

const isValidStatus = (status) => {
  return ['pending', 'approved', 'selling', 'sold_pending', 'sold_out', 'rejected', 'sold'].includes(status);
};

router.post('/', verifyToken, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category_id, student_id, college, class: className, phone, preferred_time_slots, preferred_location } = req.body;

    if (!title || title.length < 2 || title.length > 100) {
      return res.status(400).json({ code: 400, msg: '标题长度为2-100字符' });
    }
    if (!description || description.length < 10 || description.length > 2000) {
      return res.status(400).json({ code: 400, msg: '描述长度为10-2000字符' });
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ code: 400, msg: '价格必须大于0' });
    }
    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
      return res.status(400).json({ code: 400, msg: '价格最多2位小数' });
    }
    const categoryIdNum = parseInt(category_id);
    if (!category_id || isNaN(categoryIdNum)) {
      return res.status(400).json({ code: 400, msg: '请选择分类' });
    }
    const categories = await query('SELECT id FROM categories WHERE id = ?', [categoryIdNum]);
    if (categories.length === 0) {
      return res.status(400).json({ code: 400, msg: '分类不存在' });
    }

    if (!student_id || !college || !className || !phone) {
      return res.status(400).json({ code: 400, msg: '请完善学号、学院、班级、电话信息' });
    }

    if (!req.files || req.files.length < 1) {
      return res.status(400).json({ code: 400, msg: '请上传至少1张图片' });
    }
    if (req.files.length > 5) {
      return res.status(400).json({ code: 400, msg: '最多上传5张图片' });
    }

    const textToCheck = title + description;
    const sensitiveResult = sensitiveCheck(textToCheck);
    if (!sensitiveResult.ok) {
      return res.status(400).json({ code: 400, msg: `包含违规内容"${sensitiveResult.word}"，请修改后发布` });
    }

    const processedPics = await processImages(req.files);
    const picsJson = JSON.stringify(processedPics);

    const sellerStudentInfo = JSON.stringify({
      student_id,
      college,
      class: className,
      phone
    });

    let timeSlotsJson = '[]';
    if (preferred_time_slots) {
      try {
        const ts = typeof preferred_time_slots === 'string' ? preferred_time_slots : JSON.stringify(preferred_time_slots);
        JSON.parse(ts);
        timeSlotsJson = ts;
      } catch (e) {
        console.log('[DEBUG] preferred_time_slots parse failed:', e.message, 'value:', preferred_time_slots);
        timeSlotsJson = '[]';
      }
    }
    console.log('[DEBUG] final timeSlotsJson:', timeSlotsJson);

    const insertStatus = GOODS_STATUS.SELLING;
    
    try {
      var result = await query(
        'INSERT INTO goods (title, description, price, pics, category_id, seller_id, seller_student_info, preferred_time_slots, preferred_location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, priceNum, picsJson, categoryIdNum, req.user.id, sellerStudentInfo, timeSlotsJson, preferred_location || '', insertStatus]
      );
    } catch (insertErr) {
      if (insertErr.code === 'ER_TRUNCATED_WRONG_VALUE' || insertErr.message.includes('enum')) {
        console.log('状态枚举不兼容，使用 approved 状态');
        result = await query(
          'INSERT INTO goods (title, description, price, pics, category_id, seller_id, seller_student_info, preferred_time_slots, preferred_location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [title, description, priceNum, picsJson, categoryIdNum, req.user.id, sellerStudentInfo, timeSlotsJson, preferred_location || '', GOODS_STATUS.APPROVED]
        );
      } else {
        throw insertErr;
      }
    }

    res.status(200).json({
      code: 200,
      msg: '发布成功',
      data: { id: result.insertId, title, price: priceNum, pics: processedPics }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { keyword, category_id, min_price, max_price, sort = 'new', page = 1, limit = 10, status } = req.query;

    let sql = 'SELECT g.*, u.nickname as seller_nickname, u.avatar as seller_avatar FROM goods g LEFT JOIN users u ON g.seller_id = u.id WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND g.status = ?';
      params.push(status);
    } else {
      sql += ' AND g.status IN (?, ?, ?)';
      params.push(GOODS_STATUS.APPROVED, GOODS_STATUS.SELLING, 'approved');
    }

    if (keyword) {
      sql += ' AND (g.title LIKE ? OR g.description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    if (category_id) {
      sql += ' AND g.category_id = ?';
      params.push(parseInt(category_id));
    }

    if (min_price) {
      sql += ' AND g.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      sql += ' AND g.price <= ?';
      params.push(parseFloat(max_price));
    }

    let orderBy = 'g.created_at DESC';
    if (sort === 'price_asc') orderBy = 'g.price ASC';
    else if (sort === 'price_desc') orderBy = 'g.price DESC';
    else if (sort === 'hot') orderBy = 'g.view_count DESC';
    sql += ` ORDER BY ${orderBy}`;

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const goods = await query(sql, params);

    const countSql = 'SELECT COUNT(*) as total FROM goods g WHERE 1=1' + 
      (status ? ' AND g.status = ?' : ' AND g.status IN (?, ?)') +
      (keyword ? ' AND (g.title LIKE ? OR g.description LIKE ?)' : '') +
      (category_id ? ' AND g.category_id = ?' : '') +
      (min_price ? ' AND g.price >= ?' : '') +
      (max_price ? ' AND g.price <= ?' : '');
    
    const countParams = status ? [status] : [GOODS_STATUS.APPROVED, GOODS_STATUS.SELLING];
    if (keyword) {
      const kw = `%${keyword}%`;
      countParams.push(kw, kw);
    }
    if (category_id) countParams.push(parseInt(category_id));
    if (min_price) countParams.push(parseFloat(min_price));
    if (max_price) countParams.push(parseFloat(max_price));
    
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    const list = goods.map(g => {
      let pics = [], sellerInfo = {}, timeSlots = [];
      try { pics = typeof g.pics === 'string' ? JSON.parse(g.pics || '[]') : (g.pics || []); } catch(e) {}
      try { sellerInfo = typeof g.seller_student_info === 'string' ? JSON.parse(g.seller_student_info || '{}') : (g.seller_student_info || {}); } catch(e) {}
      try { timeSlots = typeof g.preferred_time_slots === 'string' ? JSON.parse(g.preferred_time_slots || '[]') : (g.preferred_time_slots || []); } catch(e) {}
      return {
        id: g.id,
        title: g.title,
        price: g.price,
        pics,
        category_id: g.category_id,
        view_count: g.view_count,
        created_at: g.created_at,
        status: g.status,
        seller_student_info: sellerInfo,
        preferred_time_slots: timeSlots,
        preferred_location: g.preferred_location,
        seller: { nickname: g.seller_nickname, avatar: g.seller_avatar }
      };
    });

    res.status(200).json({ code: 200, data: { list, total, page: pageNum, limit: limitNum } });
  } catch (err) {
    console.error('[GET /goods] Error:', err.message, err.stack);
    res.status(500).json({ code: 500, msg: '服务器错误: ' + err.message });
  }
});

router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = 'SELECT * FROM goods WHERE seller_id = ?';
    const params = [userId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const goods = await query(sql, params);

    const list = goods.map(g => ({
      id: g.id,
      title: g.title,
      price: g.price,
      pics: JSON.parse(g.pics || '[]'),
      category_id: g.category_id,
      status: g.status,
      created_at: g.created_at,
      seller_student_info: JSON.parse(g.seller_student_info || '{}'),
      preferred_time_slots: JSON.parse(g.preferred_time_slots || '[]'),
      preferred_location: g.preferred_location
    }));

    res.status(200).json({ code: 200, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY id');
    
    const tree = [];
    const map = {};
    categories.forEach(c => {
      map[c.id] = { id: c.id, name: c.name, parent_id: c.parent_id, children: [] };
    });
    categories.forEach(c => {
      if (c.parent_id === 0) {
        tree.push(map[c.id]);
      } else if (map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      }
    });

    res.status(200).json({ code: 200, data: tree });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);
    if (!goodsId) {
      return res.status(400).json({ code: 400, msg: '无效的商品ID' });
    }

    const goods = await query(
      'SELECT g.*, u.nickname as seller_nickname, u.avatar as seller_avatar FROM goods g LEFT JOIN users u ON g.seller_id = u.id WHERE g.id = ?',
      [goodsId]
    );

    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    await query('UPDATE goods SET view_count = view_count + 1 WHERE id = ?', [goodsId]);

    const g = goods[0];

    const comments = await query(
      `SELECT c.*, u.nickname, u.avatar FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.goods_id = ? ORDER BY c.created_at ASC`,
      [goodsId]
    );

    let isFavorited = false;
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const favs = await query('SELECT id FROM favorites WHERE user_id = ? AND goods_id = ?', [decoded.id, goodsId]);
        isFavorited = favs.length > 0;
      } catch (e) {}
    }

    const commentsData = comments.map(c => ({
      id: c.id,
      content: c.content,
      reply_to: c.reply_to,
      is_verified_buyer: c.is_verified_buyer === 1,
      visibility: c.visibility || 'public',
      created_at: c.created_at,
      user: { id: c.user_id, nickname: c.nickname, avatar: c.avatar }
    }));

    res.status(200).json({
      code: 200,
      data: {
        id: g.id,
        title: g.title,
        description: g.description,
        price: g.price,
        pics: JSON.parse(g.pics || '[]'),
        category_id: g.category_id,
        view_count: g.view_count + 1,
        created_at: g.created_at,
        status: g.status,
        seller: { 
          id: g.seller_id, 
          nickname: g.seller_nickname, 
          avatar: g.seller_avatar,
          student_info: JSON.parse(g.seller_student_info || '{}')
        },
        seller_student_info: JSON.parse(g.seller_student_info || '{}'),
        preferred_time_slots: JSON.parse(g.preferred_time_slots || '[]'),
        preferred_location: g.preferred_location,
        comments: commentsData,
        is_favorited: isFavorited
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);
    const userId = req.user.id;
    const { status } = req.body;

    const goods = await query('SELECT * FROM goods WHERE id = ?', [goodsId]);
    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    if (goods[0].seller_id !== userId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    await query('UPDATE goods SET status = ? WHERE id = ?', [status, goodsId]);

    res.status(200).json({ code: 200, msg: '状态更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);
    const userId = req.user.id;

    const goods = await query('SELECT * FROM goods WHERE id = ?', [goodsId]);
    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    if (goods[0].seller_id !== userId) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    await query('DELETE FROM goods WHERE id = ?', [goodsId]);

    res.status(200).json({ code: 200, msg: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;