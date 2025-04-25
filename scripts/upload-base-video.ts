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
    const result = await cloudinary.uploader.upload(
      "data:video/mp4;base64,AAAAHGZ0eXBNNFYgAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAGF21kYXTeBAAAbGliZmFhYyAxLjI4AABCAJMgBDIARwAAArEGBf//rdxF6b3m2Ui3lizYINkj7u94MjY0DaR0b+4dVlQ5cEZ3ShDGPXfS201rGj7JNfHekKI+oOPsceW6Afb2OZIf9sc7rIPADYtMHyb/1+wi9GBYb1q2nPwsuoLNhOF3W2NfvmBOeTGnbNpHmB2Qea1o+LCvhUTCxfxFRvKj4HvDvGLn7A6TyZ33rNp/u4PcEwOndLxYCfuw2Nb7ij/CD/Bqn8m0HqVFLo2eYDcO4lXvf4QLBSTgN0kH4bi8VX6Im/jA2NLkZDMv5xk7N1gQv3dEcubZ3kXOoGPBe072X7vXKGEXvOQX9Pa8LdKI6cF2kjIbqEid8Rq7aUdvPpSXkEyRUVycFpq6UE4RLYqEhA6LU0kAThqQcKm9LXQX2JnV7dfqW82bF2mC9JlczqYShkZVw5rLYKJYymkYXJAYU0eJgBaKTM4qY5tSzRXaGWPXfXbW5oEt4qFxmtRgwP6jmVnu7uHj4WXpZZRzZnPgnIYW5IhM0I+SNjfiPAQRwWmowE9skBXjkBqvzK4/aRMm4W2NwJCLgX3ykQiiUQ4GkT84XFpecbm5uW1JfjwS/rNkCoWyfGW+jaxUGC1c6y+oGiVBpEXzFZyFGxGnA4RFRyehAEY9qQZEGRrHHewpIjAa5l9ixuQRUjsHIsYhDgKIxzJBHgWUXLccRsGPv6vvOQSbDkEkxCWQ3GxnWLAaU0RT5aWSYyYiYx6tFAYGXRQgYqEhQAACAAIAGBYXGBISFhcYGBgYGBgSGAYYBhgYGBISEhgYGBgYEhgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      {
        resource_type: "video",
        public_id: "video_base",
        overwrite: true,
        invalidate: true,
        transformation: [
          { width: 1920, height: 1080, crop: "pad", background: "black" }
        ]
      }
    );

    console.log('Upload successful!', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

uploadBaseVideo();
