import { Resend } from 'resend';

const getResend = () => {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('Email service is not configured (RESEND_API_KEY missing)');
    }
    return new Resend(apiKey);
};

const sendEmail = async (to: string, subject: string, htmlContent: string) => {
    try {
        const resend = getResend();
        const from = process.env.EMAIL_FROM?.trim() || 'BookVerse <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
            from,
            to: [to],
            subject: subject,
            html: htmlContent
        });

        if (error) throw new Error(error.message);

        console.log(`✅ Email sent to ${to}: ${data?.id}`);
        return data;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        throw error; // Throwing so we can see the error in the test-route response
    }
};

export default sendEmail;
