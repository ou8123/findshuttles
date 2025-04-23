import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Note: Using NextRequest and NextResponse for App Router Route Handlers
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const details = formData.get('details') as string;
    const type = formData.get('type') as string;
    const recaptchaResponse = formData.get('g-recaptcha-response') as string;

    // --- reCAPTCHA Verification ---
    if (!recaptchaResponse) {
      return NextResponse.json({ error: 'reCAPTCHA verification failed: Missing token' }, { status: 400 });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Make sure to set this in .env.local and Vercel
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not set in environment variables.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;

    try {
      const recaptchaValidation = await fetch(verificationUrl, { method: 'POST' });
      const validationJson = await recaptchaValidation.json();

      if (!validationJson.success) {
        console.error('reCAPTCHA verification failed:', validationJson['error-codes']);
        return NextResponse.json({ error: 'reCAPTCHA verification failed', details: validationJson['error-codes'] }, { status: 400 });
      }
      // Optional: Check score if using v3, hostname, action, etc.
      // if (validationJson.score < 0.5) { ... }

    } catch (e) {
      console.error('Error during reCAPTCHA verification request:', e);
      return NextResponse.json({ error: 'Failed to verify reCAPTCHA' }, { status: 500 });
    }
    // --- End reCAPTCHA Verification ---


    if (!name || !email || !details || !type) {
      return NextResponse.json({ error: 'Missing required fields after reCAPTCHA' }, { status: 400 }); // Adjusted error message slightly
    }

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS, // Ensure this is an App Password if using Gmail 2FA
      },
    });

    await transporter.sendMail({
      from: `"${name}" <${process.env.EMAIL_FROM}>`, // Send from your verified address
      replyTo: email, // Set the user's email as the reply-to address
      to: 'rick77@gmail.com', // The destination email address
      subject: `[${type.toUpperCase()}] New Route Suggestion from ${name}`,
      text: `From: ${name} (${email})\n\nType: ${type}\n\nDetails:\n${details}`,
      html: `<p>From: ${name} (<code>${email}</code>)</p><p>Type: <strong>${type}</strong></p><div><strong>Details:</strong><br/><pre>${details}</pre></div>`,
    });

    // Redirect to a success page or return a success response
    // For simplicity, returning JSON. Consider redirecting to a thank-you page.
    // Example redirect: return NextResponse.redirect(new URL('/thank-you', req.url));
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Form handler error:', error);
    // Return a generic error message to the client
    return NextResponse.json({ error: 'Failed to process suggestion.' }, { status: 500 });
  }
}

// Optional: Add a GET handler or other methods if needed, otherwise they default to 405 Method Not Allowed
// export async function GET(req: NextRequest) {
//   return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
// }
