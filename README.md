# 📚 BookVerse — E-Commerce Book Store

BookVerse is a full-stack e-commerce web application designed to provide users with a convenient platform to discover books, manage their shopping experience, and place orders online. The project combines a modern React frontend with a Node.js and Express backend, using MongoDB for data persistence.

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation and Setup](#-installation-and-setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Testing](#-testing)
- [Security](#-security)
- [Payment Integration](#-payment-integration)
- [Deployment](#-deployment)
- [Known Limitations](#-known-limitations)
- [Future Improvements](#-future-improvements)

## 📖 Overview

BookVerse aims to deliver a user-friendly online bookstore experience with book discovery, shopping cart management, wishlists, order handling, and related e-commerce functionality.

The project demonstrates full-stack web development concepts, REST API integration, database management, authentication, frontend-backend communication, and third-party service integration.

## ✨ Features

The application includes or is designed to support the following functionality. Availability may depend on the current implementation and configuration.

- **Book Browsing:** Explore available books and their details.
- **Search and Discovery:** Find books using the application's available discovery features.
- **Shopping Cart:** Manage books selected for purchase.
- **Wishlist:** Save books for later.
- **User Authentication:** Authenticate users and manage protected resources.
- **Order Management:** Support order-related operations.
- **Payment Integration:** Integrate supported payment services.
- **AI-Powered Functionality:** Includes AI-related functionality through the configured AI integration, where implemented.
- **Responsive Interface:** A React-based interface for interacting with the bookstore.
- **Backend API:** An Express-based API for application operations.
- **Database Integration:** MongoDB with Mongoose for data persistence.

> **Note:** Refer to the current source code and configuration to confirm the availability of individual features before using this README as a final feature checklist.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS, where configured |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JWT and cookie-based authentication, as configured |
| API Development | REST APIs |
| AI Integration | Google Gemini integration, where configured |
| Testing | Project-configured backend tests and frontend validation |
| Version Control | Git and GitHub |
| Deployment | Compatible frontend and backend hosting platforms, subject to configuration |

## 📂 Project Structure

The repository is organized into frontend and backend applications.

```text
Bookverse/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── ...
│   ├── package.json
│   └── ...
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── ...
│   ├── package.json
│   └── ...
├── README.md
└── ...
```

*The structure above is illustrative. Refer to the actual repository for the complete directory layout.*

## 📋 Prerequisites

Install the following tools before setting up the application:

- Node.js — a version compatible with the project's dependencies.
- npm — included with Node.js.
- MongoDB — a local instance or an accessible MongoDB deployment.
- Git — for cloning and version control.

You may also need credentials for third-party integrations enabled in your local configuration.

## 🚀 Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/NavaneethkumarS2005/Bookverse.git
cd Bookverse
```

### 2. Install backend dependencies

```bash
npm install --prefix backend
```

### 3. Install frontend dependencies

```bash
npm install --prefix frontend
```

### 4. Configure environment variables

Create local environment files using the existing example files, if available.

For example, in PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

If the frontend provides an environment example file, copy it using the appropriate filename and location.

Open the files and configure the required values for your environment.

**Never commit real `.env` files or expose API keys, database credentials, payment secrets, or authentication secrets.**

## ⚙️ Environment Variables

The application may require environment variables for database connectivity, authentication, frontend-backend communication, email delivery, AI functionality, payments, and uploads.

Depending on the current implementation, variables may include:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `CLIENT_URL` | Frontend origin allowed by the backend |
| `JWT_SECRET` | Secret used for JWT-related operations |
| `VITE_API_URL` | Backend API base URL used by the frontend |
| `BACKEND_PUBLIC_URL` | Public base URL used when generating backend resource URLs, if supported |
| `STRIPE_SECRET_KEY` | Stripe server-side integration, if configured |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification, if configured |
| `GEMINI_API_KEY` | Google Gemini integration, if enabled |
| `RESEND_API_KEY` | Email delivery integration, if enabled |
| `EMAIL_FROM` | Configured sender identity, if required |
| `PHONEPE_MERCHANT_ID` | PhonePe integration, if enabled |
| `PHONEPE_SALT_KEY` | PhonePe integration, if enabled |

This table is illustrative, not a definitive list of required variables. Check `backend/.env.example`, the frontend environment example, and the application configuration for the exact names and requirements.

Do not add credentials directly to source code or this README.

## ▶️ Running the Application

Open separate terminals from the project root.

### Start the backend

```bash
npm run dev --prefix backend
```

This command assumes the backend defines a `dev` script in its `package.json`.

### Start the frontend

```bash
npm run dev --prefix frontend
```

This command assumes the frontend defines a `dev` script in its `package.json`.

Use the local frontend URL and backend port printed in the terminal. Ensure the frontend API URL and backend CORS configuration match your development environment.

If the scripts differ, use the commands defined in the corresponding `package.json` files.

## 🧪 Testing

Run the checks supported by the project.

### Backend tests

```bash
npm test --prefix backend
```

### Backend build

```bash
npm run build --prefix backend
```

### Frontend build

```bash
npm run build --prefix frontend
```

A successful production build does not necessarily mean every application feature works correctly. Test authentication, book browsing, cart operations, wishlist operations, order handling, and payment flows separately.

Test results should be reported only after the corresponding commands have actually been executed.

## 🔐 Security

Security considerations for the project include:

- Keep secrets in environment variables rather than source code.
- Do not commit `.env` files containing real credentials.
- Protect authenticated API endpoints with appropriate authentication and authorization checks.
- Validate and sanitize incoming data where appropriate.
- Verify payment notifications and webhook signatures using the relevant provider's documented mechanisms.
- Validate file uploads, including file types and file sizes.
- Use HTTPS for production deployments.
- Configure CORS for trusted frontend origins.
- Avoid exposing sensitive information in application logs or API responses.
- Keep dependencies updated and review security advisories.

These are security practices and review areas, not a claim that every item has been independently verified in the current codebase.

## 💳 Payment Integration

BookVerse contains payment-related integration work. Payment behavior depends on the configured provider, environment variables, credentials, callback URLs, and server-side verification logic.

**Important:** The Demo QR payment flow currently has a known issue and has not yet been confirmed to work correctly.

Before treating payments as functional, verify:

- QR generation and display.
- Payment initiation.
- Successful and failed payment handling.
- Server-side payment verification.
- Order creation and finalization.
- Duplicate callback and retry handling.
- Correct handling of cancelled or incomplete payments.

Do not use production payment credentials or represent an order as paid without successful server-side verification.

## 🌐 Deployment

The frontend and backend can be deployed separately or through a compatible hosting setup, provided their build commands, runtime requirements, environment variables, and networking configuration are correct.

Before deploying:

1. Run the frontend and backend production builds.
2. Configure production environment variables in the hosting provider.
3. Set the frontend API URL to the deployed backend.
4. Configure backend CORS for the deployed frontend origin.
5. Configure the production database connection.
6. Configure authentication cookies and HTTPS settings appropriately.
7. Set up payment-provider callback or webhook URLs, where applicable.
8. Verify image uploads and resource URLs in the deployed environment.
9. Test protected API routes and payment flows.
10. Review logs and security configuration before making the application publicly available.

Deployment configuration must be verified against the actual hosting setup. A successful local build alone does not confirm that the deployed application is working.

## ⚠️ Known Limitations

- The Demo QR payment flow requires further debugging and verification.
- Third-party integrations depend on valid credentials and correct environment configuration.
- Deployment behavior may differ from local development because of CORS, cookie, HTTPS, and resource URL settings.
- Features that depend on external services may be unavailable when those services are not configured.
- Additional end-to-end verification is needed before claiming all application flows work reliably.

Update this section when known issues are fixed and verified.

## 🔮 Future Improvements

Potential improvements include:

- Complete payment-flow verification and automated payment tests.
- Expand automated API and end-to-end test coverage.
- Improve frontend performance and bundle size.
- Add monitoring and structured error logging.
- Improve accessibility and responsive behavior.
- Strengthen deployment automation and continuous integration.
- Improve documentation for APIs and third-party integrations.
- Add further book discovery and recommendation improvements where appropriate.

These items are potential enhancements and should not be interpreted as already implemented.

---

**BookVerse** — A full-stack e-commerce bookstore project built to explore modern web development, API integration, database management, and online shopping workflows.
