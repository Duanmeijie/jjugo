const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const testStudentId = '2021150001';
const testPassword = 'test123456';

function request(path, method, postData, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + (url.search || ''),
      method: method,
      headers: { 'Accept': 'application/json' }
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (postData && method === 'POST') {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData && method === 'POST') {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function getToken() {
  const res = await request('/api/auth/login', 'POST', { student_id: testStudentId, password: testPassword });
  return res.data ? res.data.token : '';
}

function createTestImage() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  
  const testImgPath = path.join(uploadsDir, 'test.jpg');
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(testImgPath, buffer);
  return testImgPath;
}

async function test() {
  console.log('\n========== Goods API 测试 ==========\n');
  
  let token = await getToken();
  if (!token) {
    console.log('❌ 无法获取token，先注册登录');
    await request('/api/auth/register', 'POST', { student_id: testStudentId, phone: '13800138000', password: testPassword, nickname: '测试用户' });
    token = await getToken();
  }
  
  console.log('测试1: 获取分类列表');
  const c1 = await request('/api/goods/categories', 'GET');
  console.log('响应:', JSON.stringify(c1).substring(0, 100));
  console.log(c1.code === 200 && c1.data ? '✅ 通过' : '❌ 失败');

  console.log('\n测试2: 发布商品（带图片）');
  const testImg = createTestImage();
  const FormData = require('form-data');
  const form = new FormData();
  form.append('title', '测试商品');
  form.append('description', '这是一个测试商品的详细描述，用于测试商品发布功能。');
  form.append('price', '99.50');
  form.append('category_id', '1');
  form.append('images', fs.createReadStream(testImg));
  
  let goodsId = 0;
  try {
    const r2 = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/goods',
        method: 'POST',
        headers: form.getHeaders()
      };
      if (token) options.headers['Authorization'] = `Bearer ${token}`;
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        });
      });
      req.on('error', reject);
      form.pipe(req);
    });
    console.log('响应:', JSON.stringify(r2).substring(0, 100));
    if (r2.code === 200 && r2.data) {
      goodsId = r2.data.id;
      console.log('✅ 通过');
    } else {
      console.log('❌ 失败');
    }
  } catch (e) {
    console.log('❌ 失败:', e.message);
  }

  if (goodsId > 0) {
    console.log('\n测试3: 搜索商品');
    const r3 = await request('/api/goods?keyword=测试', 'GET');
    console.log('响应:', JSON.stringify(r3).substring(0, 100));
    console.log(r3.code === 200 && r3.data && r3.data.list ? '✅ 通过' : '❌ 失败');

    console.log('\n测试4: 获取商品详情');
    const r4 = await request(`/api/goods/${goodsId}`, 'GET');
    console.log('响应:', JSON.stringify(r4).substring(0, 100));
    console.log(r4.code === 200 && r4.data && r4.data.seller ? '✅ 通过' : '❌ 失败');

    console.log('\n测试5: 发表评论留言');
    const r5 = await request(`/api/goods/${goodsId}/comments`, 'POST', { content: '请问这个商品怎么样？' }, token);
    console.log('响应:', JSON.stringify(r5));
    console.log(r5.code === 200 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试6: 收藏商品');
    const r6 = await request(`/api/goods/${goodsId}/favorite`, 'POST', {}, token);
    console.log('响应:', JSON.stringify(r6));
    console.log(r6.code === 200 && r6.data && r6.data.is_favorited === true ? '✅ 通过' : '❌ 失败');

    console.log('\n测试7: 获取我的收藏列表');
    const r7 = await request('/api/user/favorites', 'GET', {}, token);
    console.log('响应:', JSON.stringify(r7).substring(0, 100));
    console.log(r7.code === 200 && r7.data ? '✅ 通过' : '❌ 失败');
  } else {
    console.log('\n❌ 无法测试后续功能（商品ID获取失败）');
  }

  console.log('\n测试8: 敏感词过滤');
  const form2 = new FormData();
  form2.append('title', '这是个诈骗商品');
  form2.append('description', '出售盗版书籍，便宜卖了');
  form2.append('price', '50');
  form2.append('category_id', '1');
  form2.append('images', fs.createReadStream(testImg));
  
  const r8 = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/goods',
      method: 'POST',
      headers: form2.getHeaders()
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    form2.pipe(req);
  });
  console.log('响应:', JSON.stringify(r8));
  console.log(r8.code === 400 && r8.msg.includes('违规内容') ? '✅ 通过' : '❌ 失败');

  console.log('\n========== 全部测试完成 ==========\n');
}

test().catch(console.error);