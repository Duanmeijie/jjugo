const { query } = require('./config/db');

async function checkTableStructure() {
  try {
    const columns = await query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'goods' ORDER BY ORDINAL_POSITION"
    );
    console.log('=== goods 表字段结构 ===');
    columns.forEach(c => {
      console.log(`${c.COLUMN_NAME}: ${c.COLUMN_TYPE}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit();
}

checkTableStructure();