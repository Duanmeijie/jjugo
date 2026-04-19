const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n=== 数据库连接成功 ===\n');
    console.log('数据库:', process.env.DB_NAME);
    console.log('已创建的表:');
    tables.forEach((t, i) => {
      const tableName = Object.values(t)[0];
      console.log(`  ${i + 1}. ${tableName}`);
    });
    console.log('\n共 ' + tables.length + ' 个表\n');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('\n=== 数据库连接失败 ===\n');
    console.error('错误:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

testDatabase();