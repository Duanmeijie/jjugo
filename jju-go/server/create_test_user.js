const { pool } = require('./config/db');
const bcrypt = require('bcrypt');

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    await pool.query(
      'INSERT IGNORE INTO users (student_id, phone, password, nickname, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['2021000001', '13800000001', hashedPassword, '测试用户', 'user', 'active']
    );
    console.log('✅ 测试用户已创建/已存在');
    
    const [rows] = await pool.query('SELECT id, student_id, nickname FROM users WHERE student_id = ?', ['2021000001']);
    console.log('用户信息:', rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit();
}

createTestUser();