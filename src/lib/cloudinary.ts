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

  const transformations = [
    // Base video settings
    {
      width: 1920,
      height: 1080,
      background: "black",
      duration: baseDuration
    },
    // Logo intro
    {
      overlay: logoPublicId,
      width: 800,
      crop: 'scale',
      gravity: 'center',
      opacity: 0,
      duration: 3,
      effect: 'fade:2000',
    },
    
    // Route title overlay
    {
      overlay: {
        font_family: 'Arial',
        font_size: 50,
        text: routeTitle,
      },
      color: '#FFFFFF',
      effect: 'shadow:40',
      gravity: 'center',
      y: 100,
      start_offset: 3,
      duration: 2,
    },

    // Destination images
    ...imagePublicIds.map((imageId, index) => ({
      overlay: imageId,
      width: 800,
      height: 450,
      crop: 'fill',
      gravity: 'center',
      opacity: index === 0 ? 100 : 0,
      start_offset: imageStartTime + (index * imageDisplayTime),
      duration: imageDisplayTime,
      effect: 'fade:1000',
    })),

    // Logo outro with CTA
    {
      overlay: logoPublicId,
      width: 800,
      crop: 'scale',
      gravity: 'center',
      opacity: 0,
      start_offset: baseDuration - 3,
      duration: 3,
      effect: 'fade:1000',
    },
    {
      overlay: {
        font_family: 'Arial',
        font_size: 40,
        text: 'Book Now',
      },
      color: '#FFFFFF',
      effect: 'shadow:40',
      gravity: 'south',
      y: 50,
      start_offset: baseDuration - 2,
      duration: 2,
    },
  ];

  try {
    // Step 1: Create base video
    console.log('Creating base video...');
    const baseVideo = await cloudinary.uploader.upload(logoPublicId, {
      resource_type: "image",
      transformation: [
        { width: 1920, height: 1080, crop: "pad", background: "black" },
        { resource_type: "video", format: "mp4", duration: baseDuration }
      ],
      public_id: `route_video_base_${Date.now()}`
    });

    console.log('Base video created:', baseVideo.public_id);

    // Step 2: Apply overlays
    console.log('Applying overlays...');
    const result = await cloudinary.uploader.explicit(baseVideo.public_id, {
      type: "upload",
      resource_type: "video",
      eager: [{
        transformation: [
          // Logo intro
          {
            overlay: logoPublicId,
            width: 800,
            crop: 'scale',
            gravity: 'center',
            start_offset: 0,
            duration: 3
          },
          // Route title
          {
            overlay: {
              font_family: 'Arial',
              font_size: 50,
              text: routeTitle
            },
            color: '#FFFFFF',
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
            start_offset: 5 + (index * 2),
            duration: 2
          })),
          // Logo outro
          {
            overlay: logoPublicId,
            width: 800,
            crop: 'scale',
            gravity: 'center',
            start_offset: baseDuration - 3,
            duration: 3
          }
        ]
      }],
      eager_async: false
    });

    if (!result || !result.eager?.[0]?.secure_url) {
      throw new Error('Failed to generate video URL');
    }

    console.log('Video generation complete');
    return result.eager[0].secure_url;
  } catch (error) {
    console.error('Error in createEagerVideo:', error);
    throw error;
  }
};

export { cloudinary };
