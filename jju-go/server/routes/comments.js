const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);
    const { content, reply_to = 0 } = req.body;

    if (!content || content.length < 2 || content.length > 500) {
      return res.status(400).json({ code: 400, msg: '留言长度为2-500字符' });
    }

    const goods = await query('SELECT id FROM goods WHERE id = ?', [goodsId]);
    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    const result = await query(
      'INSERT INTO comments (goods_id, user_id, content, reply_to) VALUES (?, ?, ?, ?)',
      [goodsId, req.user.id, content, reply_to]
    );

    const [newComment] = await query(
      'SELECT id, content, created_at FROM comments WHERE id = ?',
      [result.insertId]
    );

    res.status(200).json({
      code: 200,
      msg: '留言成功',
      data: { id: newComment.id, content: newComment.content, created_at: newComment.created_at }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);

    const comments = await query(
      `SELECT c.*, u.nickname, u.avatar FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.goods_id = ? ORDER BY c.created_at ASC`,
      [goodsId]
    );

    const data = comments.map(c => ({
      id: c.id,
      content: c.content,
      reply_to: c.reply_to,
      created_at: c.created_at,
      user: { id: c.user_id, nickname: c.nickname, avatar: c.avatar }
    }));

    res.status(200).json({ code: 200, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;