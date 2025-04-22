import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';

// Define constants for image dimensions and styling
const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_WIDTH = 450;
const LOGO_HEIGHT = 150;
const LOGO_MARGIN_BOTTOM = 30;
const TITLE_FONT_SIZE = 72;
const TAGLINE_FONT_SIZE = 38;
const TAGLINE_MARGIN_TOP = 25;
const FONT_FAMILY = 'Inter'; // Must match the name used in registerFont
const TEXT_COLOR = '#004d3b'; // Dark green
const BACKGROUND_COLOR = '#ffffff'; // White

// Register the font
// Note: This path assumes the function is running from the project root in a Node environment.
// It might need adjustment depending on the deployment environment's CWD.
const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.otf');
try {
  registerFont(fontPath, { family: FONT_FAMILY });
  console.log(`[OG Image Gen] Font registered successfully from: ${fontPath}`);
} catch (error) {
  console.error(`[OG Image Gen] Error registering font from ${fontPath}:`, error);
  // Decide if you want to throw or continue without the custom font
}

// Logo path relative to the public directory
const logoPath = path.join(process.cwd(), 'public', 'images', 'BookShuttles.com-Logo.png');

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    // Extract 'from' and 'to' parameters
    let from = searchParams.get('from') || 'Your Location';
    let to = searchParams.get('to') || 'Your Destination';

    // Sanitize from/to strings (remove parentheses, limit length)
    const sanitizedFrom = from.replace(/[()]/g, '').trim().slice(0, 100);
    const sanitizedTo = to.replace(/[()]/g, '').trim().slice(0, 100);

    console.log(`[OG Image Gen - Canvas] Generating image for: From='${sanitizedFrom}', To='${sanitizedTo}' (Original: From='${from}', To='${to}')`);

    // Create canvas and context
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // 1. Draw Background
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Calculate total content height for vertical centering
    const totalContentHeight = LOGO_HEIGHT + LOGO_MARGIN_BOTTOM + TITLE_FONT_SIZE * 1.2 + TAGLINE_MARGIN_TOP + TAGLINE_FONT_SIZE;
    const startY = (HEIGHT - totalContentHeight) / 2; // Top Y coordinate for the content block

    // 2. Load and Draw Logo
    try {
      const logo = await loadImage(logoPath);
      const logoX = (WIDTH - LOGO_WIDTH) / 2;
      const logoY = startY; // Position logo at the calculated start Y
      ctx.drawImage(logo, logoX, logoY, LOGO_WIDTH, LOGO_HEIGHT);
      console.log(`[OG Image Gen - Canvas] Logo drawn successfully from: ${logoPath}`);
    } catch (error) {
      console.error(`[OG Image Gen - Canvas] Error loading or drawing logo from ${logoPath}:`, error);
      // Continue without logo if it fails
    }

    // 3. Draw Route Text
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `700 ${TITLE_FONT_SIZE}px "${FONT_FAMILY}"`; // Weight 700
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top'; // Align text from the top
    const routeText = `${sanitizedFrom} → ${sanitizedTo}`;
    const routeTextY = startY + LOGO_HEIGHT + LOGO_MARGIN_BOTTOM; // Position below logo using startY
    ctx.fillText(routeText, WIDTH / 2, routeTextY);

    // 4. Draw Tagline
    ctx.font = `500 ${TAGLINE_FONT_SIZE}px "${FONT_FAMILY}"`; // Weight 500
    const taglineText = 'Shuttle Service · BookShuttles.com';
    const taglineY = routeTextY + TITLE_FONT_SIZE * 1.2 + TAGLINE_MARGIN_TOP; // Position below route text
    ctx.fillText(taglineText, WIDTH / 2, taglineY);

    // 5. Convert canvas to PNG buffer
    const buffer = canvas.toBuffer('image/png');

    // 6. Return response with correct headers
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache', // Keep no-cache for now
      },
    });

  } catch (e: any) {
    console.error(`[OG Image Gen - Canvas] Failed to generate image: ${e.message}`);
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
