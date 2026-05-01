const http = require('http');

const postData = [
  '--boundary',
  'Content-Disposition: form-data; name="title"',
  '',
  '测试商品',
  '--boundary',
  'Content-Disposition: form-data; name="description"',
  '',
  '这是一个测试商品的详细描述内容，至少要有10个字符',
  '--boundary',
  'Content-Disposition: form-data; name="price"',
  '',
  '99.99',
  '--boundary',
  'Content-Disposition: form-data; name="category_id"',
  '',
  '1',
  '--boundary',
  'Content-Disposition: form-data; name="preferred_time_slots"',
  '',
  '["08:00-09:30", "09:30-11:00"]',
  '--boundary',
  'Content-Disposition: form-data; name="preferred_location"',
  '',
  '一食堂附近',
  '--boundary--'
].join('\r\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/goods',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=boundary',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsIm5pY2tuYW1lIjoi6Iux5Zu4IiwiaWF0IjoxNzQ0ODI0NzY4fQ.3x8Tz6kVvT1zJ_nG8M1h5Y0vE2cW9dR7xL4pS6tU0aM'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(postData);
req.end();