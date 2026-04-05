import nodemailer from 'nodemailer'
import { env } from '../lib/env.js'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
    : undefined,
})

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nexora</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0B1020; color: #EAF1FF; margin: 0; padding: 40px 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #121A2B; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 40px; }
    .logo { font-size: 24px; font-weight: 800; color: #7C5CFF; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #EAF1FF; margin: 0 0 12px; }
    p { color: #AAB8D6; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: inline-block; background: #7C5CFF; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; }
    .muted { font-size: 13px; color: #7D8BA8; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Nexora</div>
    ${content}
    <div class="footer">
      <p class="muted">This email was sent from Nexora. If you didn't request this, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
`
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
) {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: `"Nexora" <${env.SMTP_FROM}>`,
    to: email,
    subject: 'Verify your Nexora account',
    html: baseTemplate(`
      <h1>Welcome to Nexora, ${name}!</h1>
      <p>Thanks for signing up. Please verify your email address to complete your account setup.</p>
      <a href="${verifyUrl}" class="btn">Verify Email</a>
      <p class="muted" style="margin-top:20px;">This link expires in 24 hours. If the button doesn't work, copy and paste this URL: ${verifyUrl}</p>
    `),
    text: `Welcome to Nexora! Verify your email: ${verifyUrl}`,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string,
) {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: `"Nexora" <${env.SMTP_FROM}>`,
    to: email,
    subject: 'Reset your Nexora password',
    html: baseTemplate(`
      <h1>Password reset, ${name}</h1>
      <p>We received a request to reset the password for your account. Click the button below to set a new password.</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p class="muted" style="margin-top:20px;">This link expires in 2 hours. If you didn't request a password reset, you can safely ignore this email.</p>
    `),
    text: `Reset your Nexora password: ${resetUrl}`,
  })
}
