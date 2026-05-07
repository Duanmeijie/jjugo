const { pool } = require('./config/db');

async function checkOrdersStatus() {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'"
    );
    console.log('orders status 字段:', cols);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit();
}

checkOrdersStatus();