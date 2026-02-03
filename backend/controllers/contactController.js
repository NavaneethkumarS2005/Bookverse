const Contact = require('../models/Contact');

const sendEmail = require('../utils/emailService');
const { contactNotificationTemplate } = require('../utils/emailTemplates');

exports.sendMessage = async (req, res) => {
    try {
        const contact = new Contact(req.body);
        await contact.save();

        // Notify Admin (sending to the system email for now)
        if (process.env.EMAIL_USER) {
            await sendEmail(
                process.env.EMAIL_USER,
                `New Contact Msg: ${req.body.subject}`,
                contactNotificationTemplate(req.body)
            );
        }

        res.status(201).json({ message: 'Message received!' });
    } catch (err) {
        console.error("Contact Error:", err);
        res.status(400).json({ message: 'Error sending message' });
    }
};
