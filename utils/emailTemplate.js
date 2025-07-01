const getVerificationEmailTemplate = (name, verifyUrl) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2 style="color: #0f172a;">Hi ${name},</h2>
    <p style="font-size: 16px; color: #334155;">
      Welcome to <strong>ElevateX</strong>! Please verify your email address by clicking the button below:
    </p>
    <a href="${verifyUrl}" style="
      display: inline-block;
      margin-top: 16px;
      padding: 12px 20px;
      background-color: #2563eb;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    ">Verify Email</a>
    <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
      If you didn’t create an account, you can safely ignore this email.
    </p>
  </div>
`;
const getResetPasswordEmailTemplate = (name, resetUrl) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2 style="color: #0f172a;">Hello ${name},</h2>
    <p style="font-size: 16px; color: #334155;">
      You recently requested to reset your password for your <strong>ElevateX</strong> account. Click the button below to proceed:
    </p>
    <a href="${resetUrl}" style="
      display: inline-block;
      margin-top: 16px;
      padding: 12px 20px;
      background-color: #dc2626;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    ">Reset Password</a>
    <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
      If you did not request a password reset, no further action is required.
    </p>
  </div>
`;
module.exports = {
  getVerificationEmailTemplate,
  getResetPasswordEmailTemplate,
};