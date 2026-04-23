const http = require('http');

// 获取 providers 数据
http.get('http://localhost:8080/providers', {
  headers: { 'X-API-Key': 'sk-1776865896727-302e71623479633038657266' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const json = JSON.parse(data);
    console.log('Providers:', JSON.stringify(json.providers, null, 2));
  });
}).on('error', e => console.error(e.message));
