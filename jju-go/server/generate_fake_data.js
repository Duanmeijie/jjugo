const { pool } = require('./config/db');
const bcrypt = require('bcrypt');

async function generateFakeData() {
  const conn = await pool.getConnection();
  try {
    console.log('开始生成虚拟数据...\n');

    // 1. 创建虚拟用户
    console.log('1. 创建虚拟用户...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    await conn.query(
      'INSERT IGNORE INTO users (student_id, phone, password, nickname, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['20210001', '13800000001', hashedPassword, '用户A', 'user', 'active']
    );
    await conn.query(
      'INSERT IGNORE INTO users (student_id, phone, password, nickname, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['20210002', '13800000002', hashedPassword, '用户B', 'user', 'active']
    );
    console.log('   ✅ 2个用户已创建');

    // 获取用户ID
    let [users] = await conn.query('SELECT id, student_id FROM users WHERE student_id IN (?, ?)', ['20210001', '20210002']);
    
    // 确保两个用户都存在
    if (users.length < 2) {
      // 重新查询所有用户
      [users] = await conn.query('SELECT id, student_id FROM users ORDER BY id DESC LIMIT 5');
    }
    
    const userA = users.find(u => u.student_id === '20210001') || users[0];
    const userB = users.find(u => u.student_id === '20210002') || users[1];
    console.log('   用户A:', userA, ', 用户B:', userB);
    
    if (!userA || !userB) {
      throw new Error('用户查询失败');
    }
    console.log('   ✅ 用户A ID:', userA.id, ', 用户B ID:', userB.id);

    // 2. 创建虚拟商品
    console.log('\n2. 创建虚拟商品...');
    const goodsData = [
      { title: '高等数学教材', description: '高数第七版，教材九成新，包含课后习题答案', price: 25.50, category_id: 5, seller_id: userA.id, preferred_time_slots: JSON.stringify(['08:00-09:30', '14:00-16:00']), preferred_location: '图书馆' },
      { title: '机械键盘', description: '青轴机械键盘，RGB灯效，键帽几乎无磨损', price: 120.00, category_id: 10, seller_id: userB.id, preferred_time_slots: JSON.stringify(['19:00-21:00']), preferred_location: '宿舍' },
      { title: '篮球', description: '斯伯丁篮球，7号标准比赛用球，充气饱满', price: 80.00, category_id: 13, seller_id: userA.id, preferred_time_slots: JSON.stringify(['16:00-18:00']), preferred_location: '操场' },
      { title: '台灯', description: 'LED护眼台灯，三档亮度可调，USB充电接口', price: 35.00, category_id: 12, seller_id: userB.id, preferred_time_slots: JSON.stringify(['10:00-12:00']), preferred_location: '教学楼' },
      { title: '英语四级真题', description: '2021-2023年真题合集，含答案详解，赠送词汇手册', price: 15.00, category_id: 6, seller_id: userA.id, preferred_time_slots: JSON.stringify(['09:30-11:30']), preferred_location: '自习室' }
    ];

    const sellerInfoA = JSON.stringify({ student_id: '20210001', college: '计算机学院', class: '计科1班', phone: '13800000001' });
    const sellerInfoB = JSON.stringify({ student_id: '20210002', college: '经济管理学院', class: '金融2班', phone: '13800000002' });

    const goodsIds = [];
    for (let i = 0; i < goodsData.length; i++) {
      const g = goodsData[i];
      const sellerInfo = g.seller_id === userA.id ? sellerInfoA : sellerInfoB;
      const [result] = await conn.query(
        'INSERT INTO goods (title, description, price, pics, category_id, seller_id, seller_student_info, preferred_time_slots, preferred_location, status, view_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [g.title, g.description, g.price, '[]', g.category_id, g.seller_id, sellerInfo, g.preferred_time_slots, g.preferred_location, 'selling', 0]
      );
      goodsIds.push(result.insertId);
      console.log(`   ✅ 商品${i+1}: ${g.title} (ID: ${result.insertId})`);
    }

    // 3. 创建虚拟留言
    console.log('\n3. 创建虚拟留言...');
    const commentData = [
      { goods_id: goodsIds[0], user_id: userB.id, content: '这本书还有吗？' },
      { goods_id: goodsIds[1], user_id: userA.id, content: '键盘轴体是什么类型的？' },
      { goods_id: goodsIds[2], user_id: userB.id, content: '篮球是几号的？' }
    ];

    for (let i = 0; i < commentData.length; i++) {
      const c = commentData[i];
      await conn.query(
        'INSERT INTO comments (goods_id, user_id, content, reply_to, is_verified_buyer) VALUES (?, ?, ?, ?, ?)',
        [c.goods_id, c.user_id, c.content, 0, 0]
      );
      console.log(`   ✅ 留言${i+1}: ${c.content}`);
    }

    console.log('\n✅ 虚拟数据生成完成！');
    console.log('\n测试账号:');
    console.log('  用户A: student_id=20210001, password=123456');
    console.log('  用户B: student_id=20210002, password=123456');

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    conn.release();
    process.exit();
  }
}

generateFakeData();