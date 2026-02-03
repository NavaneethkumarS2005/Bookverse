const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const sendEmail = require('./utils/emailService');

async function test() {
    console.log("Testing email...");
    console.log("User:", process.env.EMAIL_USER);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ Missing EMAIL_USER or EMAIL_PASS in .env");
        return;
    }

    try {
        const info = await sendEmail(
            process.env.EMAIL_USER, // Send to self
            "Test Email from BookVerse",
            "<h1>It Works!</h1><p>Your email configuration is correct.</p>"
        );
        if (info) {
            console.log("✅ Email sent successfully!");
        } else {
            console.log("❌ Email failed to send. Check console for details.");
        }
    } catch (e) {
        console.error("❌ Error:", e);
    }
}

test();
