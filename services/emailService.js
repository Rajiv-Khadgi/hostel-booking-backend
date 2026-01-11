import dotenv from 'dotenv';
dotenv.config();


import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,       // 587 for TLS
    secure: false,   // false for TLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS   
    }
});

// Verify transporter at startup
transporter.verify((err, success) => {
    if (err) console.error('Email transporter error:', err);
    else console.log('Email transporter is ready');
});

//  Generic Email 
export const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"HomeSpace" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (err) {
        console.error(`Failed to send email to ${to}:`, err.message);
    }
};

// Reset Password Email 
export const sendResetEmail = async (email, token) => {
    const resetLink = `http://localhost:3000/reset-password?token=${token}&email=${email}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🔑 Reset Your HomeSpace Password</h2>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" 
               style="background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Reset Password
            </a>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
                This link will expire in <strong>1 hour</strong> and can only be used <strong>once</strong>.
            </p>
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #999;">
                If you didn't request this, safely ignore this email.
            </p>
        </div>
    `;

    await sendEmail(email, 'Password Reset - HomeSpace', html);
};

// Booking Notification Email 
export const sendBookingNotification = async (to, roomId, hostelName, studentId) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🏠 New Booking Request</h2>
            <p>A student (ID: ${studentId}) has requested to book room <strong>${roomId}</strong> in your hostel <strong>${hostelName}</strong>.</p>
            <p>Please login to approve or reject this request.</p>
        </div>
    `;
    await sendEmail(to, 'New Booking Request - HomeSpace', html);
};
