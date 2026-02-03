# BookVerse E-commerce Application

This is a full-stack MERN application (MongoDB, Express, React, Node.js).
It is separated into two main folders:

*   **frontend/** - React application (Vite)
*   **backend/** - Node.js/Express API

## Deployment

### Backend (Render)
1.  Create a new Web Service on Render.
2.  Connect this repository.
3.  Root Directory: `backend`
4.  Build Command: `npm install`
5.  Start Command: `node server.js`
6.  Environment Variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (Set to Frontend URL), `STRIPE_SECRET_KEY`

### Frontend (Vercel)
1.  Import this repository to Vercel.
2.  Root Directory: `frontend`
3.  Environment Variables: `VITE_API_URL` (Set to Backend URL), `VITE_STRIPE_PUBLIC_KEY`

## Local Development

1.  **Backend:**
    ```bash
    cd backend
    npm install
    node server.js
    ```

2.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
