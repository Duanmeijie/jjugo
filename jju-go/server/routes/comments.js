const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { createNotification, TYPES } = require('./notifications');

router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);
    const { content, reply_to = 0, visibility = 'public' } = req.body;
    const userId = req.user.id;

    if (!content || content.length < 2 || content.length > 500) {
      return res.status(400).json({ code: 400, msg: '留言长度为2-500字符' });
    }

    const goods = await query('SELECT id, seller_id FROM goods WHERE id = ?', [goodsId]);
    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    const isVerifiedBuyer = await checkIsVerifiedBuyer(userId, goodsId);

    const result = await query(
      'INSERT INTO comments (goods_id, user_id, content, reply_to, is_verified_buyer, visibility) VALUES (?, ?, ?, ?, ?, ?)',
      [goodsId, userId, content, reply_to, isVerifiedBuyer ? 1 : 0, visibility]
    );

    const [newComment] = await query(
      `SELECT c.*, u.nickname, u.avatar FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    const seller = goods[0];
    if (seller.seller_id !== userId) {
      await createNotification(
          seller.seller_id,
          TYPES.NEW_COMMENT,
          '新留言通知',
          `您的商品收到新的留言`,
          goodsId
      );
    }

    res.status(200).json({
      code: 200,
      msg: '留言成功',
      data: {
        id: newComment.id,
        content: newComment.content,
        is_verified_buyer: newComment.is_verified_buyer === 1,
        visibility: newComment.visibility,
        created_at: newComment.created_at,
        user: { id: newComment.user_id, nickname: newComment.nickname, avatar: newComment.avatar }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

async function checkIsVerifiedBuyer(userId, goodsId) {
  const orders = await query(
    `SELECT id FROM orders 
     WHERE goods_id = ? AND buyer_id = ? AND status IN ('pending_review', 'after_sale', 'history')`,
    [goodsId, userId]
  );
  return orders.length > 0;
}

router.get('/:id/comments', verifyToken, async (req, res) => {
  try {
    const goodsId = parseInt(req.params.id);
    const userId = req.user.id;

    const goods = await query('SELECT seller_id FROM goods WHERE id = ?', [goodsId]);
    if (goods.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }

    const isSeller = goods[0].seller_id === userId;

    const comments = await query(
      `SELECT c.*, u.nickname, u.avatar FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.goods_id = ? ORDER BY c.created_at ASC`,
      [goodsId]
    );

    const data = comments
      .filter(c => {
        if (c.visibility === 'public') return true;
        if (c.visibility === 'private') {
          return isSeller || c.user_id === userId;
        }
        return true;
      })
      .map(c => ({
        id: c.id,
        content: c.content,
        reply_to: c.reply_to,
        is_verified_buyer: c.is_verified_buyer === 1,
        visibility: c.visibility || 'public',
        created_at: c.created_at,
        user: { id: c.user_id, nickname: c.nickname, avatar: c.avatar },
        is_own: c.user_id === userId,
        is_seller: isSeller
      }));

    res.status(200).json({ code: 200, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.delete('/:commentId', verifyToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.id;

    const comments = await query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ code: 404, msg: '留言不存在' });
    }

    const comment = comments[0];
    
    const goods = await query('SELECT seller_id FROM goods WHERE id = ?', [comment.goods_id]);
    const isSeller = goods.length > 0 && goods[0].seller_id === userId;

    if (comment.user_id !== userId && !isSeller) {
      return res.status(403).json({ code: 403, msg: '无权限' });
    }

    await query('DELETE FROM comments WHERE id = ?', [commentId]);

    res.status(200).json({ code: 200, msg: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;