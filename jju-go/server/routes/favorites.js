const express = require('express');
const router = express.Router({ mergeParams: true });
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.post('/:goodsId/favorite', verifyToken, async (req, res) => {
  const goodsId = parseInt(req.params.goodsId);
  try {
    const userId = req.user.id;

    const goods = await query('SELECT id FROM goods WHERE id = ?', [goodsId]);
    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    const existing = await query(
      'SELECT id FROM favorites WHERE user_id = ? AND goods_id = ?',
      [userId, goodsId]
    );

    if (existing.length > 0) {
      await query('DELETE FROM favorites WHERE user_id = ? AND goods_id = ?', [userId, goodsId]);
      res.status(200).json({ code: 200, msg: '取消收藏成功', data: { is_favorited: false } });
    } else {
      await query('INSERT INTO favorites (user_id, goods_id) VALUES (?, ?)', [userId, goodsId]);
      res.status(200).json({ code: 200, msg: '收藏成功', data: { is_favorited: true } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;