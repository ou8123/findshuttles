import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload buffer to Cloudinary
export const uploadBuffer = async (
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<{ publicId: string; url: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) {
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

// Create a video with transformations
export const createEagerVideo = async (
  logoPublicId: string,
  imagePublicIds: string[],
  routeTitle: string
): Promise<string> => {
  const baseDuration = 14; // Total video duration
  const imageStartTime = 5; // When destination images start
  const imageDisplayTime = 2; // Seconds per image

  try {
    // Generate video URL with transformations
    console.log('Generating video URL...');
    const videoUrl = cloudinary.url("video_base", {
      resource_type: "video",
      transformation: [
        // Logo intro
        {
          overlay: logoPublicId,
          width: 800,
          crop: 'scale',
          gravity: 'center',
          opacity: 0,
          start_offset: 0,
          duration: 3,
          effect: 'fade:2000'
        },
        // Route title
        {
          overlay: {
            font_family: 'Arial',
            font_size: 50,
            text: routeTitle
          },
          color: '#FFFFFF',
          effect: 'shadow:40',
          gravity: 'center',
          y: 100,
          start_offset: 3,
          duration: 2
        },
        // Destination images
        ...imagePublicIds.map((imageId, index) => ({
          overlay: imageId,
          width: 800,
          height: 450,
          crop: 'fill',
          gravity: 'center',
          opacity: index === 0 ? 100 : 0,
          start_offset: 5 + (index * 2),
          duration: 2,
          effect: 'fade:1000'
        })),
        // Logo outro
        {
          overlay: logoPublicId,
          width: 800,
          crop: 'scale',
          gravity: 'center',
          opacity: 0,
          start_offset: baseDuration - 3,
          duration: 3,
          effect: 'fade:1000'
        },
        // Book Now CTA
        {
          overlay: {
            font_family: 'Arial',
            font_size: 40,
            text: 'Book Now'
          },
          color: '#FFFFFF',
          effect: 'shadow:40',
          gravity: 'south',
          y: 50,
          start_offset: baseDuration - 2,
          duration: 2
        }
      ]
    });

    console.log('Video URL generated:', videoUrl);

    // Create permanent video
    console.log('Creating permanent video...');
    const result = await cloudinary.uploader.upload(videoUrl, {
      resource_type: "video",
      public_id: `route_video_${Date.now()}`,
      overwrite: true,
      invalidate: true
    });

    if (!result || !result.secure_url) {
      throw new Error('Failed to generate video URL');
    }

    console.log('Video generation complete');
    return result.secure_url;
  } catch (error) {
    console.error('Error in createEagerVideo:', error);
    throw error;
  }
};

export { cloudinary };
