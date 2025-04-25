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
    const baseVideo = await cloudinary.uploader.upload("data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzA5NSBiYWVlNDAwIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMiAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAACDWWIhAA3//728P4FNjuZQQAAAu5tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAZAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACGHRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAZAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAgAAAAIAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAGQAAAAAAAEAAAAAAZBtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAACgAAAAEAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAE7bWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAA+3N0YmwAAACXc3RzZAAAAAAAAAABAAAAh2F2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAgACAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAxYXZjQwFkAAr/4QAYZ2QACqzZX4iIhAAAAwAEAAADAFA8SJZYAQAGaOvjyyLAAAAAGHN0dHMAAAAAAAAAAQAAAAQAAAEAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAQAAAABAAAAJHN0c3oAAAAAAAAAAAAAAAQAAAA2AAAACQAAAAoAAAAKAAAAFHN0Y28AAAAAAAAAAQAAADAAAABbdWR0YQAAAFNtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU4LjI5LjEwMA==", {
      resource_type: "video",
      transformation: [
        { width: 1920, height: 1080, background: "black" },
        { duration: baseDuration }
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
