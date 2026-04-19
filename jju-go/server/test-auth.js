const http = require('http');

function makeRequest(path, method, postData, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n========== Auth API 测试 ==========\n');

  const testStudentId = '2021150001';
  const testPhone = '13800138000';
  const testPassword = 'test123456';
  let token = '';

  try {
    console.log('测试1: 注册新用户');
    const r1 = await makeRequest('/api/auth/register', 'POST', {
      student_id: testStudentId,
      phone: testPhone,
      password: testPassword,
      nickname: '测试用户'
    });
    console.log('响应:', JSON.stringify(r1));
    console.log(r1.code === 200 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试2: 用错误密码登录');
    const r2 = await makeRequest('/api/auth/login', 'POST', {
      student_id: testStudentId,
      password: 'wrongpwd'
    });
    console.log('响应:', JSON.stringify(r2));
    console.log(r2.code === 401 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试3: 用正确密码登录');
    const r3 = await makeRequest('/api/auth/login', 'POST', {
      student_id: testStudentId,
      password: testPassword
    });
    console.log('响应:', JSON.stringify(r3));
    if (r3.code === 200 && r3.data && r3.data.token) {
      token = r3.data.token;
      console.log('✅ 通过');
    } else {
      console.log('❌ 失败');
    }

    console.log('\n测试4: 用token访问 /api/auth/me');
    const r4 = await makeRequest('/api/auth/me', 'GET', null, token);
    console.log('响应:', JSON.stringify(r4));
    console.log(r4.code === 200 ? '✅ 通过' : '❌ 失败');

    console.log('\n测试5: 用错误token访问');
    const r5 = await makeRequest('/api/auth/me', 'GET', null, 'invalidtoken');
    console.log('响应:', JSON.stringify(r5));
    console.log(r5.code === 401 ? '✅ 通过' : '❌ 失败');

    console.log('\n========== 全部测试完成 ==========\n');
  } catch (err) {
    console.error('测试运行错误:', err.message);
  }
}

runTests();