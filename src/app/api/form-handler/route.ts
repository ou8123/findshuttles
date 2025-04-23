import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY;

async function verifyHcaptchaToken(token: string): Promise<{ success: boolean; errorCodes?: string[] }> {
  if (!HCAPTCHA_SECRET_KEY) {
    console.error('HCAPTCHA_SECRET_KEY environment variable is not set.');
    return { success: false, errorCodes: ['missing-secret-key'] };
  }

  const verificationUrl = 'https://api.hcaptcha.com/siteverify';
  const params = new URLSearchParams();
  params.append('response', token);
  params.append('secret', HCAPTCHA_SECRET_KEY);
  // Optionally add 'remoteip': req.ip if needed and available

  try {
    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.success) {
      console.log('hCaptcha verification successful:', data);
      return { success: true };
    } else {
      console.warn('hCaptcha verification failed:', data);
      return { success: false, errorCodes: data['error-codes'] || ['verification-failed'] };
    }
  } catch (error: any) {
    console.error('Error during hCaptcha verification request:', error);
    return { success: false, errorCodes: ['request-exception'] };
  }
}


export async function POST(req: NextRequest) {
  try {
    const receivedData = await req.json();
    console.log('Received data in API handler:', receivedData);

    // Destructure data - expect hcaptchaToken now
    const { name, email, details, type, hcaptchaToken } = receivedData;

    // Basic validation for required fields + hCaptcha token
    if (name == null || email == null || details == null || type == null || !hcaptchaToken) {
      console.error('Validation failed. Missing fields or hCaptcha token:', {
          name: name,
          email: email,
          details: details,
          type: type,
          hcaptchaToken: hcaptchaToken
      });
      return NextResponse.json({ error: 'Missing required fields or CAPTCHA token.' }, { status: 400 });
    }

    // --- hCaptcha Verification ---
    const captchaResult = await verifyHcaptchaToken(hcaptchaToken);
    if (!captchaResult.success) {
      console.error(`hCaptcha verification failed: ${captchaResult.errorCodes?.join(', ')}`);
      return NextResponse.json({ error: 'CAPTCHA verification failed.', details: captchaResult.errorCodes }, { status: 400 });
    }
    // --- End hCaptcha Verification ---

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Proceed with sending email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${name}" <${process.env.EMAIL_FROM}>`,
      replyTo: email,
      to: 'rick77@gmail.com',
      subject: `[${type.toUpperCase()}] New Route Suggestion from ${name}`,
      text: `From: ${name} (${email})\n\nType: ${type}\n\nDetails:\n${details}`,
      html: `<p>From: ${name} (<code>${email}</code>)</p><p>Type: <strong>${type}</strong></p><div><strong>Details:</strong><br/><pre>${details}</pre></div>`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Form handler error:', error);
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
       return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to process suggestion.' }, { status: 500 });
  }
}
