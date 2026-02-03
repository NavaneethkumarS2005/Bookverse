# Backend & Database Setup Guide

This guide explains how to **download, install, and connect** a real database to your BookVerse application.

## 🛠 Option A: MongoDB (Recommended)
This project is pre-configured for **MongoDB**. It is the easiest way to get started.

### 1. Cloud Database (Easiest - No Download Required)
Use **MongoDB Atlas** to host your database for free in the cloud.

1.  **Register**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up.
2.  **Create Cluster**: Select the **Shared (Free)** cluster option.
3.  **Create User**:
    -   Go to **Database Access** -> "Add New Database User".
    -   Create a username and password. **Write these down!**
4.  **Network Access**:
    -   Go to **Network Access** -> "Add IP Address".
    -   Select "Allow Access from Anywhere" (`0.0.0.0/0`).
5.  **Get Connection String**:
    -   Click **Connect** on your cluster dashboard.
    -   Select **Drivers** (Node.js).
    -   Copy the connection string (it looks like `mongodb+srv://...`).
6.  **Connect**:
    -   Open the file `d:\E-commerce Book Store\backend\.env.example`.
    -   Rename it to `.env`.
    -   Paste your connection string: `MONGO_URI=mongodb+srv://user:pass@...` within the file.

### 2. Local Database (Install on PC)
If you prefer to run it offline on your computer:

1.  **Download**: Go to [MongoDB Community Server Download](https://www.mongodb.com/try/download/community).
2.  **Install**: Run the installer (msi).
    -   Select "Complete" setup.
    -   **Important**: Check "Install MongoDB as a Service".
3.  **Run**: MongoDB usually starts automatically.
4.  **Connect**:
    -   Your local URL is `mongodb://localhost:27017/bookverse`.
    -   This is already the default in my code, so you don't even need to change the `.env` file!

---

## 🛠 Option B: MySQL (Advanced)
**Note**: The current code uses `Mongoose`, which is for MongoDB. To use MySQL, you would need to rewrite the backend database layer.

### 1. Download & Install
1.  **Download**: Go to [MySQL Installer](https://dev.mysql.com/downloads/installer/).
2.  **Install**: Choose "Developer Default".
    -   During setup, you will create a Root Password. **Remember it!**

### 2. How to switch code to MySQL
*This requires changing the code. You cannot just "connect" the current code to MySQL.*

1.  **Uninstall Mongoose**: `npm uninstall mongoose`
2.  **Install Sequelize**: `npm install sequelize mysql2`
3.  **Rewrite Models**: You must replace `models/User.js`, etc., with Sequelize models.
    ```javascript
    // Example MySQL Model (Conceptual)
    const User = sequelize.define('User', {
       name: DataTypes.STRING,
       email: DataTypes.STRING
    });
    ```
4.  **Update Server**: Replace `mongoose.connect()` with `sequelize.authenticate()`.

---

## 🚀 Running the Project
1.  **Backend**:
    Open Command Prompt in `d:\E-commerce Book Store\backend` and run:
    ```bash
    npm start
    ```
    *If you see "MongoDB Connected", you are successful!*

2.  **Frontend**:
    Open `login.html` or `index.html` in your browser.
