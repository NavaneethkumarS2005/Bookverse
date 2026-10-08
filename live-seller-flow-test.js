const fs = require('fs');
const path = require('path');

async function main() {
  const baseUrl = 'http://127.0.0.1:5001';

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bookverse.com', password: 'admin123' })
  });

  const loginData = await loginRes.json();
  console.log('LOGIN_STATUS', loginRes.status);
  console.log('LOGIN_HAS_TOKEN', !!loginData.token);

  if (!loginData.token) {
    console.error('LOGIN_FAILED', JSON.stringify(loginData));
    process.exit(1);
  }

  const imagePath = path.join(__dirname, 'backend', 'sample-image.png');
  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAF', 'base64');
  fs.writeFileSync(imagePath, pngBytes);

  const form = new FormData();
  form.append('images', new Blob([pngBytes], { type: 'image/png' }), 'sample.png');

  const uploadRes = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    body: form
  });

  const uploadData = await uploadRes.json();
  console.log('UPLOAD_STATUS', uploadRes.status);
  console.log('UPLOAD_IMAGE_URL', uploadData.imageUrl || '(missing)');
  console.log('UPLOAD_IMAGES_COUNT', (uploadData.images || []).length);

  const bookPayload = {
    title: 'Live Upload Test Book',
    author: 'QA Bot',
    price: 299,
    genre: 'Fiction',
    image: uploadData.imageUrl || '/images/bookstore-hero-editorial.png',
    images: uploadData.images || [uploadData.imageUrl || '/images/bookstore-hero-editorial.png'],
    condition: 'Good',
    description: 'Uploaded during live validation.',
    isbn: '9780141033570',
    rating: 4.5,
    reviews: 0
  };

  const createRes = await fetch(`${baseUrl}/api/books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.token}`
    },
    body: JSON.stringify(bookPayload)
  });

  const createData = await createRes.json();
  console.log('CREATE_STATUS', createRes.status);
  console.log('CREATED_ID', createData._id || createData.id || '(missing)');
  console.log('CREATED_TITLE', createData.title || '(missing)');

  const listRes = await fetch(`${baseUrl}/api/books?keyword=Live%20Upload%20Test%20Book`);
  const listData = await listRes.json();
  console.log('LIST_STATUS', listRes.status);
  console.log('MATCHED_RESULTS', listData.books?.length || 0);

  if (!createData._id && !createData.id) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('SCRIPT_ERROR', err);
  process.exit(1);
});
