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
       WHERE f.user_id = ? AND g.status IN ('approved', 'selling') 
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

router.get('/info', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const users = await query(
      'SELECT id, student_id, phone, nickname, avatar, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, msg: '用户不存在' });
    }

    const user = users[0];
    const hasCompleteInfo = !!(user.student_id && user.phone);

    res.status(200).json({
      code: 200,
      data: {
        id: user.id,
        student_id: user.student_id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        has_complete_info: hasCompleteInfo
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.put('/info', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { student_id, phone, nickname } = req.body;

    if (student_id) {
      const existing = await query(
        'SELECT id FROM users WHERE student_id = ? AND id != ?',
        [student_id, userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ code: 400, msg: '学号已被使用' });
      }
    }

    if (phone) {
      const existing = await query(
        'SELECT id FROM users WHERE phone = ? AND id != ?',
        [phone, userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ code: 400, msg: '手机号已被使用' });
      }
    }

    const updates = [];
    const params = [];

    if (student_id) {
      updates.push('student_id = ?');
      params.push(student_id);
    }
    if (phone) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (nickname) {
      updates.push('nickname = ?');
      params.push(nickname);
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, msg: '没有要更新的信息' });
    }

    params.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    res.status(200).json({ code: 200, msg: '信息更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;