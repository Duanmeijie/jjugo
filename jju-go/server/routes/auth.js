const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { validateStudentId, validatePhone, validatePassword, validateNickname } = require('../utils/validator');

router.post('/register', async (req, res) => {
  try {
    const { student_id, phone, password, nickname } = req.body;

    if (!validateStudentId(student_id)) {
      return res.status(400).json({ code: 400, msg: '学号必须为11位数字' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ code: 400, msg: '手机号格式错误' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ code: 400, msg: '密码3-15位，支持字母/数字/特殊字符' });
    }
    if (!validateNickname(nickname)) {
      return res.status(400).json({ code: 400, msg: '昵称支持中英文，最多20位' });
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE student_id = ? OR phone = ?',
      [student_id, phone]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ code: 409, msg: '学号或手机号已被注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (student_id, phone, password, nickname, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, phone, hashedPassword, nickname, 'user', 'active']
    );

    res.status(200).json({
      code: 200,
      msg: '注册成功',
      data: { id: result.insertId, student_id, nickname }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { student_id, phone, password } = req.body;

    if (!student_id && !phone) {
      return res.status(400).json({ code: 400, msg: '请输入学号或手机号' });
    }
    if (!password) {
      return res.status(400).json({ code: 400, msg: '请输入密码' });
    }

    let sql = 'SELECT * FROM users WHERE ';
    let params = [];
    if (student_id) {
      sql += 'student_id = ?';
      params.push(student_id);
    } else {
      sql += 'phone = ?';
      params.push(phone);
    }

    const users = await query(sql, params);
    if (users.length === 0) {
      return res.status(401).json({ code: 401, msg: '账号或密码错误' });
    }

    const user = users[0];
    if (user.status === 'banned') {
      return res.status(403).json({ code: 403, msg: '账号已被封禁' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, msg: '账号或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, student_id: user.student_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      code: 200,
      msg: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          student_id: user.student_id,
          nickname: user.nickname,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, student_id, phone, nickname, avatar, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ code: 404, msg: '用户不存在' });
    }
    res.status(200).json({ code: 200, data: users[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

router.post('/admin/setup', async (req, res) => {
  try {
    const { student_id, phone, password, nickname } = req.body;

    if (!validateStudentId(student_id)) {
      return res.status(400).json({ code: 400, msg: '学号必须为11位数字' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ code: 400, msg: '手机号格式错误' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ code: 400, msg: '密码3-15位，支持字母/数字/特殊字符' });
    }
    if (!validateNickname(nickname)) {
      return res.status(400).json({ code: 400, msg: '昵称支持中英文，最多20位' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (student_id, phone, password, nickname, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, phone, hashedPassword, nickname, 'admin', 'active']
    );

    res.status(200).json({ code: 200, msg: '管理员创建成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;