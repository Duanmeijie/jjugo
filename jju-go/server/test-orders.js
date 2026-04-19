const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

const sellerInfo = { student_id: '2021150002', phone: '13800138001', password: 'seller123', nickname: '卖家用户' };
const buyerInfo = { student_id: '2021150003', phone: '13800138002', password: 'buyer123', nickname: '买家用户' };

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

function createTestImage() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const testImgPath = path.join(uploadsDir, 'order_test.jpg');
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(testImgPath, buffer);
  return testImgPath;
}

function getToken(credentials) {
  return request('/api/auth/login', 'POST', credentials).then(r => r.data ? r.data.token : '');
}

async function runTests() {
  console.log('\n========== Orders & Reviews API 测试 ==========\n');

  let sellerToken = '', buyerToken = '', orderId = 0, goodsId = 0, correctTradeCode = '';

  try {
    console.log('准备: 注册买家和卖家用户');
    await request('/api/auth/register', 'POST', sellerInfo);
    await request('/api/auth/register', 'POST', buyerInfo);
    sellerToken = await getToken(sellerInfo);
    buyerToken = await getToken(buyerInfo);
    console.log('用户注册完成\n');

    console.log('测试1: 卖家发布商品');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('title', '测试订单商品');
    form.append('description', '这是一个用于测试订单流程的商品描述，测试内容包括下单、支付、交易码核验和评价。');
    form.append('price', '150.00');
    form.append('category_id', '1');
    form.append('images', fs.createReadStream(createTestImage()));

    const r1 = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/goods',
        method: 'POST',
        headers: form.getHeaders()
      };
      if (sellerToken) options.headers['Authorization'] = `Bearer ${sellerToken}`;
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
      });
      req.on('error', reject);
      form.pipe(req);
    });

    console.log('响应:', JSON.stringify(r1).substring(0, 80));
    if (r1.code === 200 && r1.data) {
      goodsId = r1.data.id;
      console.log('✅ 通过');
    } else {
      console.log('❌ 失败');
    }

    console.log('\n测试2: 买家下单');
    const r2 = await request('/api/orders', 'POST', { goods_id: goodsId }, buyerToken);
    console.log('响应:', JSON.stringify(r2));
    if (r2.code === 200 && r2.data && r2.data.status === 'pending_pay') {
      orderId = r2.data.id;
      console.log('✅ 通过');
    } else {
      console.log('❌ 失败');
    }

    console.log('\n3: 买家支付');
    const r3 = await request(`/api/orders/${orderId}/pay`, 'POST', {}, buyerToken);
    console.log('响应:', JSON.stringify(r3));
    if (r3.code === 200 && r3.data && r3.data.trade_code) {
      correctTradeCode = r3.data.trade_code;
      console.log('✅ 通过，交易码:', correctTradeCode);
    } else {
      console.log('❌ 失败');
    }

    console.log('\n测试4: 用错误交易码核验');
    const r4 = await request(`/api/orders/${orderId}/verify`, 'POST', { trade_code: '000000' }, buyerToken);
    console.log('响应:', JSON.stringify(r4));
    console.log(r4.code === 400 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试5: 用正确交易码核验');
    const r5 = await request(`/api/orders/${orderId}/verify`, 'POST', { trade_code: correctTradeCode }, buyerToken);
    console.log('响应:', JSON.stringify(r5));
    console.log(r5.code === 200 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试6: 买家评价卖家');
    const r6 = await request(`/api/orders/${orderId}/review`, 'POST', { rating: 5, content: '商品很好，卖家发货很快！' }, buyerToken);
    console.log('响应:', JSON.stringify(r6));
    console.log(r6.code === 200 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试7: 卖家评价买家');
    const r7 = await request(`/api/orders/${orderId}/review`, 'POST', { rating: 5, content: '买家爽快，交易顺利！' }, sellerToken);
    console.log('响应:', JSON.stringify(r7));
    console.log(r7.code === 200 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试8: 获取买家订单列表');
    const r8 = await request('/api/orders/buyer', 'GET', {}, buyerToken);
    console.log('响应:', JSON.stringify(r8).substring(0, 80));
    console.log(r8.code === 200 && r8.data && r8.data.length > 0 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试9: 获取卖家订单列表');
    const r9 = await request('/api/orders/seller', 'GET', {}, sellerToken);
    console.log('响应:', JSON.stringify(r9).substring(0, 80));
    console.log(r9.code === 200 && r9.data && r9.data.length > 0 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试10: 获取用户好评率');
    const r10 = await request('/api/user/2/rating', 'GET');
    console.log('响应:', JSON.stringify(r10));
    console.log(r10.code === 200 && r10.data ? '✅ 通过' : '❌ 失败');

    console.log('\n========== 全部测试完成 ==========\n');
  } catch (err) {
    console.error('测试错误:', err.message);
  }
}

runTests();