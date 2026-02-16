# 📚 BookVerse - Modern E-Commerce Platform

> A full-stack MERN application for buying and selling books, featuring a premium UI, secure payments, and real-time inventory management.

![BookVerse Hero](https://placehold.co/1200x400/4f46e5/ffffff?text=BookVerse+Production+Ready)

## 🚀 Live Demo
- **Frontend (Netlify):** [https://book-vers.netlify.app](https://book-vers.netlify.app)
- **Backend (Render):** [https://bookverse-backend-gw75.onrender.com](https://bookverse-backend-gw75.onrender.com)

---

## ✨ Key Features
- **Zero-Localhost Architecture**: Fully deployed and optimized for cloud execution.
- **Secure Payments**: Integrated **Stripe** payment gateway ensuring PCI compliance.
- **Authentication**: JWT-based auth with secure, httpOnly cookies.
- **Dynamic Catalog**: 
  - **Internal Inventory**: Direct "Add to Cart" & Checkout.
  - **External Affiliate Links**: Smart redirection to Amazon/Flipkart for specific titles.
- **Admin Dashboard**: manage books, view orders, and track user stats.
- **Responsive Design**: Mobile-first UI built with Tailwind CSS.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Services**: Stripe (Payments), Cloudinary (Images), Nodemailer (Emails)

---

## 🔧 Installation & Local Development

### Prerequisites
- Node.js v16+
- MongoDB Local or Atlas URI

### 1. Clone & Install
```bash
git clone https://github.com/NavaneethkumarS2005/Bookverse.git
cd Bookverse
```

### 2. Backend Setup
```bash
cd backend
npm install
# Create .env file with:
# MONGO_URI=your_mongo_uri
# JWT_SECRET=your_jwt_secret
# CLIENT_URL=http://localhost:5173
# STRIPE_SECRET_KEY=your_stripe_key
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
# Create .env file with:
# VITE_API_URL=http://localhost:5000
# VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
npm run dev
```

---

## 🛡️ Production & Security
This project adheres to strict security standards:
- **CORS**: Whitelisted origins only.
- **Cookies**: `SameSite=None`, `Secure`, `HttpOnly`.
- **Inputs**: Sanitized against NoSQL injection.
- **Dependencies**: Regularly audited for vulnerabilities.

## 🤝 Support
For any issues, please use the [Contact Form](https://book-vers.netlify.app/contact) on the live site or open an issue in this repository.

---
*Maintained by Navaneeth Kumar*

---

## 🚀 Deployment (Railway Backend + Netlify Frontend)

### Backend (Railway)
1.  **Push** this repo to GitHub.
2.  Go to **Railway.app** -> New Project -> Deploy from GitHub repo.
3.  **Settings**:
    *   **Root Directory**: `backend`
    *   **Variables**: Add `MONGO_URI`, `STRIPE_SECRET_KEY`, `JWT_SECRET`, etc.
    *   **Networking**: A domain will be generated (e.g., `bookverse.up.railway.app`).
4.  Copy this URL.

### Frontend (Netlify)
1.  Go to **Netlify** -> Add New Site -> Import from Git.
2.  **Settings**:
    *   **Base Directory**: `frontend`
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
3.  **Environment Variables**:
    *   Key: `VITE_API_URL`
    *   Value: `https://your-railway-url.up.railway.app` (The URL you copied)
4.  **Deploy!** 🚀
