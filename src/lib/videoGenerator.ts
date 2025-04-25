import {  OpenAI } from 'openai';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { join } from 'path';
import prisma from './prisma';
import { cloudinary, uploadBuffer, createEagerVideo } from './cloudinary';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Upload logo to Cloudinary if not already uploaded
async function ensureLogoUploaded(): Promise<string> {
  const logoId = 'book_shuttles_logo';
  try {
    // Check if logo exists in Cloudinary
    const result = await cloudinary.api.resource(logoId);
    return result.public_id;
  } catch {
    // Upload logo to Cloudinary
    const logoPath = join(process.cwd(), 'public', 'images', 'BookShuttles.com-Logo.png');
    const uploadResult = await cloudinary.uploader.upload(logoPath, {
      public_id: logoId,
      overwrite: true
    });
    return uploadResult.public_id;
  }
}

// Generate and upload destination images
async function generateDestinationImages(destinationCity: string, routeId: string): Promise<string[]> {
  const prompts = [
    `Beautiful scenic view of ${destinationCity}, Costa Rica, travel photography style`,
    `Popular tourist destination in ${destinationCity}, Costa Rica, professional photo`,
    `Natural landscape near ${destinationCity}, Costa Rica, high quality travel photo`
  ];

  const imagePublicIds = await Promise.all(
    prompts.map(async (prompt, index) => {
      // Generate image with DALL-E
      const imgResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });

      // Download the generated image
      if (!imgResponse.data?.[0]?.url) {
        throw new Error('Failed to generate image with DALL-E');
      }
      const imageUrl = imgResponse.data[0].url;
      const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });

      // Upload to Cloudinary
      const publicId = `route_${routeId}_image_${index}`;
      const result = await uploadBuffer(Buffer.from(data), '', publicId);
      return result.publicId;
    })
  );

  return imagePublicIds;
}

export async function generateRouteVideo(routeId: string): Promise<{
  videoUrl: string;
  imagePublicIds: string[];
}> {
  // Get route details
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      departureCity: true,
      destinationCity: true,
    },
  });

  if (!route) {
    throw new Error('Route not found');
  }

  try {
    // Ensure logo is uploaded
    const logoPublicId = await ensureLogoUploaded();

    // Generate and upload destination images
    const imagePublicIds = await generateDestinationImages(
      route.destinationCity.name,
      route.id
    );

    // Generate route title
    const routeTitle = `${route.departureCity.name} → ${route.destinationCity.name}`;

    // Generate video with transformations
    const videoUrl = await createEagerVideo(logoPublicId, imagePublicIds, routeTitle);

    // Update route with image IDs and video URL
    await prisma.route.update({
      where: { id: route.id },
      data: {
        imagePublicIds: imagePublicIds,
        videoUrl: videoUrl,
      },
    });

    return {
      videoUrl,
      imagePublicIds,
    };
  } catch (error) {
    console.error('Error generating route video:', error);
    throw error;
  }
}
