const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
const testStudentId = '2021000001';
const testPassword = 'test123';

function request(path, method, postData, token, isJson = true) {
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
      if (isJson) {
        options.headers['Content-Type'] = 'application/json';
      }
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
      if (isJson) {
        req.write(JSON.stringify(postData));
      } else {
        postData.pipe(req);
        return;
      }
    }
    req.end();
  });
}

async function getToken() {
  const res = await request('/api/auth/login', 'POST', { student_id: testStudentId, password: testPassword });
  console.log('登录响应:', JSON.stringify(res));
  return res.data && res.data.token ? res.data.token : '';
}

function createTestImage() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  
  const testImgPath = path.join(uploadsDir, 'test_publish.jpg');
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(testImgPath, buffer);
  return testImgPath;
}

async function testPublish() {
  console.log('\n========== 测试商品发布（带新字段） ==========\n');
  
  // 先尝试登录
  let token = await getToken();
  
  if (!token) {
    console.log('未找到token，先注册...');
    await request('/api/auth/register', 'POST', { 
      student_id: testStudentId, 
      phone: '13800138000', 
      password: testPassword, 
      nickname: '测试用户' 
    });
    
    console.log('注册完成，尝试登录...');
    token = await getToken();
  }
  
  console.log('Token:', token ? '获取成功' : '获取失败');
  
  if (!token) {
    console.log('❌ 无法获取token，测试终止');
    return;
  }
  
  const testImg = createTestImage();
  const form = new FormData();
  form.append('title', '测试商品带新字段');
  form.append('description', '这是一个测试商品的详细描述，用于测试商品发布功能是否正常。');
  form.append('price', '99.50');
  form.append('category_id', '1');
  form.append('student_id', '2021150001');
  form.append('college', '计算机学院');
  form.append('class', '软件1班');
  form.append('phone', '13800138000');
  form.append('preferred_time_slots', JSON.stringify(['08:00-09:30', '09:30-11:00']));
  form.append('preferred_location', '一食堂附近');
  form.append('images', fs.createReadStream(testImg));
  
  console.log('\n发送请求...');
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
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
  
  console.log('\n响应:', JSON.stringify(r2));
  if (r2.code === 200 && r2.data) {
    console.log('✅ 发布成功');
  } else {
    console.log('❌ 发布失败:', r2.msg || r2);
  }
}

testPublish().catch(console.error);