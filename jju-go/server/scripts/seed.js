/**
 * ============================================
 * 数据库自动充盈脚本 (Seed Script)
 * ============================================
 * ⚠️ 安全提示：
 * 执行前请务必备份数据库！
 * 建议运行命令: mysqldump jjugo_db > backup_$(date +%Y%m%d_%H%M%S).sql
 *
 * 安装依赖：
 * cd server && npm i @faker-js/faker axios bcryptjs
 */

const { pool, query, getConnection } = require('../config/db');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const FORCE = process.argv.includes('--force');

async function getImageUrl(id) {
  const seed = 1000 + id;
  return `https://picsum.photos/seed/${seed}/400/300`;
}

async function generateUsers(count = 10) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const studentId = `2021${String(100000 + i).slice(1)}${String(i).padStart(2, '0')}`;
    const plainPassword = `pass${studentId}`;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const avatarUrl = await getImageUrl(i);
    users.push({
      student_id: studentId,
      phone: '138' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0'),
      password: hashedPassword,
      nickname: faker.internet.username(),
      avatar: avatarUrl,
      role: i === 0 ? 'admin' : 'user',
      status: 'active'
    });
  }
  return users;
}

async function generateProducts(count = 30, sellerIds) {
  const products = [];
  const categories = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const titles = [
    '高等数学教材', '线性代数辅导', '大学英语精读', '数据结构与算法', '计算机网络',
    'iPhone 13 Pro', '小米手机', '华为平板', '戴尔笔记本', '机械键盘',
    '宿舍小风扇', '台灯护眼', '充电宝', '蓝牙耳机', '无线鼠标',
    '篮球', '羽毛球拍', '乒乓球拍', '瑜伽垫', '跑步机',
    '二手自行车', '电动车充电器', '宿舍收纳箱', '床上书桌', '窗帘',
    '专业西装', '正装衬衫', '皮鞋', '双肩包', '手提包'
  ];
  const descriptions = [
    '九成新，完好无损', '使用一段时间，功能正常', '全新未拆封', '性价比高，欢迎咨询',
    '质量保证，可面交', '实物拍摄，所见即所得', '配件齐全', '可小刀'
  ];
  const statuses = ['approved', 'approved', 'approved', 'sold'];

  for (let i = 0; i < count; i++) {
    const productId = i + 1;
    const pics = [];
    for (let j = 0; j < 3; j++) {
      pics.push(await getImageUrl(productId * 10 + j));
    }
    products.push({
      title: titles[i % titles.length],
      description: faker.helpers.arrayElement(descriptions),
      price: parseFloat(faker.commerce.price({ min: 5, max: 500, dec: 2 })),
      category_id: faker.helpers.arrayElement(categories),
      seller_id: faker.helpers.arrayElement(sellerIds),
      pics: JSON.stringify(pics),
      status: faker.helpers.arrayElement(statuses)
    });
  }
  return products;
}

async function generateReviews(count = 80, orderIds, userIds) {
  const reviews = [];
  const contents = [
    '非常好，满意！', '物超所值，推荐购买', '质量不错，物流快',
    '和描述一致', '服务态度好', '性价比高', '下次还来', '赞！',
    '一般般吧', '可以'
  ];
  for (let i = 0; i < count; i++) {
    reviews.push({
      order_id: orderIds[i % orderIds.length] || 1,
      reviewer_id: faker.helpers.arrayElement(userIds),
      target_id: faker.helpers.arrayElement(userIds),
      rating: faker.number.int({ min: 1, max: 5 }),
      content: faker.helpers.arrayElement(contents),
      created_at: faker.date.past()
    });
  }
  return reviews;
}

async function checkDataExists() {
  try {
    const userResult = await query('SELECT COUNT(*) as count FROM users');
    const productResult = await query('SELECT COUNT(*) as count FROM goods');
    return userResult[0].count > 0 || productResult[0].count > 0;
  } catch (err) {
    return false;
  }
}

async function seed() {
  const connection = await getConnection();
  try {
    const hasData = await checkDataExists();
    if (hasData && !FORCE) {
      console.log('⚠️ 数据已存在，跳过（如需强制重置请加 --force）');
      return;
    }

    await connection.beginTransaction();
    console.log('🔄 开始种子数据注入...\n');

    if (FORCE) {
      await connection.query('DELETE FROM reviews');
      await connection.query('DELETE FROM goods');
      await connection.query('DELETE FROM users');
      console.log('🗑️ 已清空现有数据');
    }

    const users = await generateUsers(10);
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      await connection.query(
        `INSERT INTO users (student_id, phone, password, nickname, avatar, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.student_id, u.phone, u.password, u.nickname, u.avatar, u.role, u.status]
      );
      if ((i + 1) % 10 === 0) {
        console.log(`✅ 用户: 已插入 ${i + 1}/10`);
      }
    }
    console.log('✅ 用户插入完成 (10条)\n');

    const userIds = Array.from({ length: 10 }, (_, i) => i + 1);
    const products = await generateProducts(30, userIds);
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      await connection.query(
        `INSERT INTO goods (title, description, price, category_id, seller_id, pics, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.title, p.description, p.price, p.category_id, p.seller_id, p.pics, p.status]
      );
      if ((i + 1) % 10 === 0) {
        console.log(`✅ 商品: 已插入 ${i + 1}/30`);
      }
    }
    console.log('✅ 商品插入完成 (30条)\n');

    const productIds = Array.from({ length: 30 }, (_, i) => i + 1);
    const reviews = await generateReviews(80, productIds, userIds);
    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      await connection.query(
        `INSERT INTO reviews (order_id, reviewer_id, target_id, rating, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [r.order_id, r.reviewer_id, r.target_id, r.rating, r.content, r.created_at]
      );
      if ((i + 1) % 10 === 0) {
        console.log(`✅ 评价: 已插入 ${i + 1}/80`);
      }
    }
    console.log('✅ 评价插入完成 (80条)\n');

    await connection.commit();
    console.log('========================================');
    console.log('✅ 种子数据注入完成');
    console.log('========================================');
    console.log('\n📋 测试账号:');
    console.log('  - 管理员: student_id=2021xxxxxx01, password=pass2021xxxxxx01');
    console.log('  - 普通用户: student_id=2021xxxxxx02, password=pass2021xxxxxx02');
    console.log('\n💡 使用 --force 强制重置: node scripts/seed.js --force');

  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('回滚失败:', rollbackErr.message);
      }
    }
    console.error('❌ 注入失败:', err.message);
    throw err;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        console.error('释放连接失败:', releaseErr.message);
      }
    }
  }
}

seed()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('脚本执行失败:', err.message);
    process.exit(1);
  });