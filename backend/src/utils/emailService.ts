import nodemailer from 'nodemailer';

const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASS) {
        throw new Error('Email service is not configured (EMAIL_USER / EMAIL_APP_PASS missing)');
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASS
        }
    });
};

const sendEmail = async (to: string, subject: string, htmlContent: string) => {
    try {
        const transporter = getTransporter();
        const mailOptions = {
            from: `"BookVerse Store" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        throw error; // Throwing so we can see the error in the test-route response
    }
};

export default sendEmail;
