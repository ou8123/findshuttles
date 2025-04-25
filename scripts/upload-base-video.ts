import { cloudinary } from '../src/lib/cloudinary';
import axios from 'axios';

async function uploadBaseVideo() {
  try {
    // Download blank video
    console.log('Downloading blank video...');
    const response = await axios.get('https://res.cloudinary.com/demo/video/upload/v1/blank.mp4', {
      responseType: 'arraybuffer'
    });

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: 'video_base',
          resource_type: 'video',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(Buffer.from(response.data));
    });

    console.log('Upload successful!', uploadResponse);
  } catch (error) {
    console.error('Error:', error);
  }
}

uploadBaseVideo();
