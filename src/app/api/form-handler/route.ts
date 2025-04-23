import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const RECAPTCHA_PROJECT_ID = process.env.RECAPTCHA_PROJECT_ID;
const RECAPTCHA_API_KEY = process.env.RECAPTCHA_API_KEY;
const RECAPTCHA_SITE_KEY = "6LcsCSIrAAAAAOvQ2_r5wrPA9fIx3e3rLPFHvK95"; // Enterprise Site Key
const EXPECTED_ACTION = 'SUGGEST_ROUTE'; // Should match the action in the frontend execute call
const SCORE_THRESHOLD = 0.5; // Adjust this threshold as needed (0.0 - 1.0)

async function verifyRecaptchaToken(token: string): Promise<{ valid: boolean; score: number; error?: string }> {
  if (!RECAPTCHA_PROJECT_ID || !RECAPTCHA_API_KEY) {
    console.error('reCAPTCHA Enterprise environment variables (PROJECT_ID, API_KEY) are not set.');
    return { valid: false, score: 0, error: 'Server configuration error.' };
  }

  const assessmentUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments?key=${RECAPTCHA_API_KEY}`;

  try {
    const response = await fetch(assessmentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: {
          token: token,
          siteKey: RECAPTCHA_SITE_KEY,
          expectedAction: EXPECTED_ACTION,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`reCAPTCHA assessment request failed with status ${response.status}: ${errorBody}`);
      return { valid: false, score: 0, error: `Assessment request failed (${response.status})` };
    }

    const assessment = await response.json();

    // Log the assessment details for debugging
    // console.log('reCAPTCHA Assessment:', JSON.stringify(assessment, null, 2));

    if (!assessment.tokenProperties || !assessment.riskAnalysis) {
       console.error('Invalid assessment response structure:', assessment);
       return { valid: false, score: 0, error: 'Invalid assessment response.' };
    }

    // Check if the token is valid and the action matches
    if (assessment.tokenProperties.valid !== true) {
      console.warn(`reCAPTCHA token invalid. Reason: ${assessment.tokenProperties.invalidReason}`);
      return { valid: false, score: 0, error: `Token invalid: ${assessment.tokenProperties.invalidReason}` };
    }

    if (assessment.tokenProperties.action !== EXPECTED_ACTION) {
       console.warn(`reCAPTCHA action mismatch. Expected: ${EXPECTED_ACTION}, Got: ${assessment.tokenProperties.action}`);
       return { valid: false, score: 0, error: 'Action mismatch.' };
    }

    // Check the risk score
    const score = assessment.riskAnalysis.score;
    if (score < SCORE_THRESHOLD) {
      console.warn(`reCAPTCHA score ${score} is below threshold ${SCORE_THRESHOLD}.`);
      return { valid: false, score: score, error: `Low score: ${score}` };
    }

    // If all checks pass
    console.log(`reCAPTCHA assessment successful. Score: ${score}`);
    return { valid: true, score: score };

  } catch (error: any) {
    console.error('Error during reCAPTCHA assessment request:', error);
    return { valid: false, score: 0, error: `Assessment request exception: ${error.message}` };
  }
}


export async function POST(req: NextRequest) {
  try {
    // Read data from JSON body now
    const { name, email, details, type, recaptchaToken } = await req.json();

    if (!name || !email || !details || !type || !recaptchaToken) {
      return NextResponse.json({ error: 'Missing required fields or reCAPTCHA token' }, { status: 400 });
    }

    // --- reCAPTCHA Enterprise Verification ---
    const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);
    if (!recaptchaResult.valid) {
      // Log the specific error from verification
      console.error(`reCAPTCHA verification failed: ${recaptchaResult.error}`);
      // Return a generic message to the client, but include details for server logs
      return NextResponse.json({ error: 'reCAPTCHA verification failed.', details: recaptchaResult.error }, { status: 400 });
    }
    // --- End reCAPTCHA Verification ---

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Proceed with sending email only if reCAPTCHA passed
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
      subject: `[${type.toUpperCase()}] New Route Suggestion from ${name} (Score: ${recaptchaResult.score.toFixed(2)})`, // Include score
      text: `From: ${name} (${email})\n\nType: ${type}\n\nDetails:\n${details}\n\n(reCAPTCHA Score: ${recaptchaResult.score.toFixed(2)})`,
      html: `<p>From: ${name} (<code>${email}</code>)</p><p>Type: <strong>${type}</strong></p><div><strong>Details:</strong><br/><pre>${details}</pre></div><hr/><p><small>reCAPTCHA Score: ${recaptchaResult.score.toFixed(2)}</small></p>`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Form handler error:', error);
    // Check if it's a JSON parsing error
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
       return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 });
    }
    // Return a generic error message to the client
    return NextResponse.json({ error: 'Failed to process suggestion.' }, { status: 500 });
  }
}
