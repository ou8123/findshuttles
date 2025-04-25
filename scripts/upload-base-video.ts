import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables
config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBaseVideo() {
  try {
    // Create a black video
    console.log('Creating base video...');
    const result = await cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", {
      resource_type: "image",
      public_id: "video_base",
      overwrite: true,
      invalidate: true,
      transformation: [
        { width: 1920, height: 1080, crop: "pad", background: "black" },
        { resource_type: "video", format: "mp4", duration: 14 }
      ]
    });

    console.log('Upload successful!', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

uploadBaseVideo();
