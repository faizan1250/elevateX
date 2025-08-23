import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'Gmail', // or use 'Mailgun', 'SendGrid' etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your app-specific password
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"ElevateX" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Error sending email:', err);
    throw new Error('Failed to send email');
  }
};

export default sendEmail;;
