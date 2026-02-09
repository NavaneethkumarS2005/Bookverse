require('dotenv').config();
const sendEmail = require('./utils/emailService');

const testEmail = async () => {
    console.log("📧 Testing Email Service...");
    const userEmail = "navaneethkumar981@gmail.com"; // Sending to yourself to test

    try {
        const result = await sendEmail(
            userEmail,
            "Test Email from BookVerse",
            "<h1>It Works!</h1><p>If you see this, the email service is working perfectly.</p>"
        );

        if (result) {
            console.log("✅ Email Sent Successfully!");
        } else {
            console.log("❌ Email Failed (Check logs above)");
        }
    } catch (err) {
        console.error("❌ Critical Error:", err);
    }
};

testEmail();
