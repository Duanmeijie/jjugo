const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/goods/43',
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 800));
  });
});

req.on('error', e => console.error('Error:', e.message));
req.end();