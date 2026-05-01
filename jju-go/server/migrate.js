const { query } = require('./config/db');

async function migrate() {
  console.log('开始数据库迁移...\n');

  try {
    // 1. 修改 seller_student_info 为 JSON 类型
    console.log('1. 修改 seller_student_info 为 JSON 类型...');
    try {
      await query("ALTER TABLE goods MODIFY COLUMN seller_student_info JSON COMMENT '卖家学生信息'");
      console.log('   ✅ 完成');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('   ⚠️ 字段已存在');
      } else {
        console.log('   ⚠️', e.message);
      }
    }

    // 2. 修改 preferred_time_slots 为 JSON 类型
    console.log('2. 修改 preferred_time_slots 为 JSON 类型...');
    try {
      await query("ALTER TABLE goods MODIFY COLUMN preferred_time_slots JSON COMMENT '期望交易时间数组'");
      console.log('   ✅ 完成');
    } catch (e) {
      console.log('   ⚠️', e.message);
    }

    // 3. 确保 preferred_location 字段存在且类型正确
    console.log('3. 检查 preferred_location 字段...');
    const cols = await query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'goods' AND COLUMN_NAME = 'preferred_location'"
    );
    if (cols.length === 0) {
      await query("ALTER TABLE goods ADD COLUMN preferred_location VARCHAR(200) COMMENT '期望交易地点'");
      console.log('   ✅ 添加完成');
    } else if (!cols[0].COLUMN_TYPE.includes('varchar')) {
      await query("ALTER TABLE goods MODIFY COLUMN preferred_location VARCHAR(200) COMMENT '期望交易地点'");
      console.log('   ✅ 修改完成');
    } else {
      console.log('   ✅ 已存在');
    }

    // 4. 修改 status 枚举值
    console.log('4. 修改 status 枚举值...');
    try {
      await query("ALTER TABLE goods MODIFY COLUMN status ENUM('pending','approved','selling','sold_pending','sold_out','rejected','sold') DEFAULT 'pending'");
      console.log('   ✅ 完成');
    } catch (e) {
      console.log('   ⚠️', e.message);
    }

    // 验证最终结构
    console.log('\n=== 验证 goods 表字段结构 ===');
    const finalCols = await query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'goods' ORDER BY ORDINAL_POSITION"
    );
    finalCols.forEach(c => {
      console.log(`${c.COLUMN_NAME}: ${c.COLUMN_TYPE}`);
    });

    console.log('\n✅ 迁移完成！');
  } catch (e) {
    console.error('迁移失败:', e.message);
  }
  process.exit();
}

migrate();