const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { upload, processImages } = require('../utils/upload');
const { check: sensitiveCheck } = require('../utils/sensitiveFilter');

router.post('/', verifyToken, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category_id } = req.body;

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

    const result = await query(
      'INSERT INTO goods (title, description, price, pics, category_id, seller_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, priceNum, picsJson, categoryIdNum, req.user.id, 'approved']
    );

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
    const { keyword, category_id, min_price, max_price, sort = 'new', page = 1, limit = 10 } = req.query;

    let sql = 'SELECT g.*, u.nickname as seller_nickname, u.avatar as seller_avatar FROM goods g LEFT JOIN users u ON g.seller_id = u.id WHERE g.status = ?';
    const params = ['approved'];
    const countParams = [];

    if (keyword) {
      sql += ' AND (g.title LIKE ? OR g.description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
      countParams.push(kw, kw);
    }

    if (category_id) {
      sql += ' AND g.category_id = ?';
      params.push(parseInt(category_id));
      countParams.push(parseInt(category_id));
    }

    if (min_price) {
      sql += ' AND g.price >= ?';
      params.push(parseFloat(min_price));
      countParams.push(parseFloat(min_price));
    }

    if (max_price) {
      sql += ' AND g.price <= ?';
      params.push(parseFloat(max_price));
      countParams.push(parseFloat(max_price));
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

    const countSql = 'SELECT COUNT(*) as total FROM goods g WHERE g.status = ?' + 
      (keyword ? ' AND (g.title LIKE ? OR g.description LIKE ?)' : '') +
      (category_id ? ' AND g.category_id = ?' : '') +
      (min_price ? ' AND g.price >= ?' : '') +
      (max_price ? ' AND g.price <= ?' : '');
    
    const countParamsFinal = ['approved', ...countParams];
    const countResult = await query(countSql, countParamsFinal);
    const total = countResult[0].total;

    const list = goods.map(g => ({
      id: g.id,
      title: g.title,
      price: g.price,
      pics: JSON.parse(g.pics || '[]'),
      category_id: g.category_id,
      view_count: g.view_count,
      created_at: g.created_at,
      seller: { nickname: g.seller_nickname, avatar: g.seller_avatar }
    }));

    res.status(200).json({ code: 200, data: { list, total, page: pageNum, limit: limitNum } });
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
        seller: { id: g.seller_id, nickname: g.seller_nickname, avatar: g.seller_avatar },
        comments: commentsData,
        is_favorited: isFavorited
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;