import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Removed reCAPTCHA constants and helper function

export async function POST(req: NextRequest) {
  // Re-enabled the main logic
  try {
    // Read data from JSON body
    const receivedData = await req.json();
    // Log the received data
    console.log('Received data in API handler:', receivedData);

    // Destructure data - no recaptchaToken expected now
    const { name, email, details, type } = receivedData;

    // Basic validation for required fields
    // Note: Simple checkbox verification happens client-side only
    if (name == null || email == null || details == null || type == null) {
      console.error('Validation failed. Received values:', {
          name: name,
          email: email,
          details: details,
          type: type,
      });
      // Changed error message slightly
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Removed reCAPTCHA verification block

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Proceed with sending email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS, // Ensure this is an App Password if using Gmail 2FA
      },
    });

    await transporter.sendMail({
      from: `"${name}" <${process.env.EMAIL_FROM}>`,
      replyTo: email,
      to: 'rick77@gmail.com',
      // Updated subject and body to remove score
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
