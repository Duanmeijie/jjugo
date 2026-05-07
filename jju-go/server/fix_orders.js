const { pool } = require('./config/db');

async function fixOrdersStatus() {
  try {
    console.log('修复 orders status 枚举值...');
    await pool.query(
      "ALTER TABLE orders MODIFY COLUMN status ENUM('cart','pending_payment','pending_delivery','pending_review','after_sale','history','cancelled') DEFAULT 'cart'"
    );
    console.log('✅ 修复完成');
    
    const [cols] = await pool.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'"
    );
    console.log('当前 status 字段类型:', cols[0].COLUMN_TYPE);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit();
}

fixOrdersStatus();