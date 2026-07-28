const http = require('http');
const r = http.request({hostname:'localhost',port:3000,path:'/',method:'GET',timeout:10000});
r.on('response', res => {
  let d = '';
  res.on('data', c => { d += c; });
  res.on('end', () => {
    console.log('Status:', res.statusCode, 'Length:', d.length);
    process.exit(0);
  });
});
r.on('error', e => {
    console.log('Error:', e.message);
    process.exit(1);
  });