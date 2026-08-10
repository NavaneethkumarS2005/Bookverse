const http = require('http');
const urls = [
  '/api/discovery/authors',
  '/api/discovery/publishers',
  '/api/discovery/upcoming-books',
  '/api/discovery/book-fairs',
  '/api/discovery/booths'
];

(async () => {
  for (const path of urls) {
    await new Promise((resolve) => {
      const req = http.get({ hostname: '127.0.0.1', port: 5000, path, method: 'GET' }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (Array.isArray(json)) {
              console.log(`${path} -> ${res.statusCode} | count=${json.length}`);
            } else {
              console.log(`${path} -> ${res.statusCode} | keys=${Object.keys(json).join(', ')}`);
            }
          } catch (e) {
            console.log(`${path} -> ${res.statusCode} | length=${body.length}`);
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        console.log(`${path} -> error ${err.message}`);
        resolve();
      });
    });
  }
})();
