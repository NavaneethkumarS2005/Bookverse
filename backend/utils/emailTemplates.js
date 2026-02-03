const styles = {
    container: `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;`,
    header: `background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 30px; text-align: center;`,
    headerTitle: `color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;`,
    content: `padding: 40px 30px; color: #374151; line-height: 1.6;`,
    button: `display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: 600; text-align: center; margin: 20px 0; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);`,
    footer: `background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;`,
    table: `width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;`,
    th: `background-color: #f3f4f6; text-align: left; padding: 12px 15px; font-weight: 600; color: #4b5563; font-size: 14px;`,
    td: `padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px;`,
    highlight: `color: #6366f1; font-weight: 600;`
};

exports.welcomeTemplate = (name) => `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h1 style="${styles.headerTitle}">BookVerse</h1>
        </div>
        <div style="${styles.content}">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${name}! 👋</h2>
            <p>We are thrilled to have you join our community of book lovers.</p>
            <p>At BookVerse, you can discover hidden gems, review your favorites, and build your digital library.</p>
            <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="${styles.button}">Start Exploring</a>
            </div>
            <p>Happy Reading!<br>The BookVerse Team</p>
        </div>
        <div style="${styles.footer}">
            <p>© ${new Date().getFullYear()} BookVerse. All rights reserved.</p>
        </div>
    </div>
`;

exports.passwordResetTemplate = (resetUrl) => `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h1 style="${styles.headerTitle}">Password Reset</h1>
        </div>
        <div style="${styles.content}">
            <h2 style="color: #1f2937; margin-top: 0;">Forgot your password? 🔒</h2>
            <p>We received a request to reset the password for your BookVerse account.</p>
            <p>To reset your password, click the button below:</p>
            <div style="text-align: center;">
                <a href="${resetUrl}" style="${styles.button}">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Or copy this link: <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="${styles.footer}">
            <p>This link expires in 1 hour.</p>
            <p>© ${new Date().getFullYear()} BookVerse. Security Team</p>
        </div>
    </div>
`;

exports.orderTemplate = (orderId, items, total) => {
    const itemsRows = items.map(item => `
        <tr>
            <td style="${styles.td}">${item.title}</td>
            <td style="${styles.td} text-align: center;">${item.quantity}</td>
            <td style="${styles.td} text-align: right;">₹${item.price * item.quantity}</td>
        </tr>
    `).join('');

    return `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="${styles.headerTitle}">Order Confirmed! 🚀</h1>
            </div>
            <div style="${styles.content}">
                <h2 style="color: #1f2937; margin-top: 0;">Thanks for your order!</h2>
                <p>We're getting your books ready. Here are the details for Order <strong>#${orderId.slice(-6).toUpperCase()}</strong>:</p>
                
                <table style="${styles.table}">
                    <thead>
                        <tr>
                            <th style="${styles.th}">Item</th>
                            <th style="${styles.th} text-align: center;">Qty</th>
                            <th style="${styles.th} text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                        <tr>
                            <td colspan="2" style="${styles.td} font-weight: bold; text-align: right;">Total Amount</td>
                            <td style="${styles.td} font-weight: bold; text-align: right; font-size: 16px; color: #1f2937;">₹${total}</td>
                        </tr>
                    </tbody>
                </table>
                
                <p>We'll notify you when your order ships.</p>
            </div>
            <div style="${styles.footer}">
                <p>© ${new Date().getFullYear()} BookVerse. Customer Support</p>
            </div>
        </div>
    `;
};

exports.contactNotificationTemplate = (data) => `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h1 style="${styles.headerTitle}">New Contact Message 📩</h1>
        </div>
        <div style="${styles.content}">
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${data.email}" style="color:#6366f1;">${data.email}</a></p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
                <p style="margin: 0; font-style: italic;">"${data.message}"</p>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>Sent from BookVerse Contact Form</p>
        </div>
    </div>
`;
