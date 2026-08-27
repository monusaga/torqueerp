import http from 'http';

async function testUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      let size = 0;
      res.on('data', chunk => size += chunk.length);
      res.on('end', () => {
        console.log(`Total Downloaded Size: ${size} bytes\n`);
        resolve({ status: res.statusCode, size, headers: res.headers });
      });
    }).on('error', (err) => {
      console.log(`URL: ${url} ERROR:`, err.message);
      resolve({ error: err.message });
    });
  });
}

async function run() {
  console.log('--- Testing API Port 4000 ---');
  await testUrl('http://localhost:4000/api/v1/downloads/android/info');
  await testUrl('http://localhost:4000/api/v1/downloads/android');
  await testUrl('http://localhost:4000/downloads/TorqueERP-v1.0.0.apk');

  console.log('--- Testing Web Vite Port 3000 ---');
  await testUrl('http://localhost:3000/api/v1/downloads/android/info');
  await testUrl('http://localhost:3000/api/v1/downloads/android');
  await testUrl('http://localhost:3000/downloads/TorqueERP-v1.0.0.apk');
}

run();
