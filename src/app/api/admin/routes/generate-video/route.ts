import { NextRequest, NextResponse } from 'next/server';
import { generateRouteVideo } from '@/lib/videoGenerator';
import { checkApiAuth, RequiredRole, secureApiResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await checkApiAuth(request, RequiredRole.Admin);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    // Get route ID from query params
    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get('routeId');

    if (!routeId) {
      return secureApiResponse(
        { error: 'Missing routeId parameter' },
        400
      );
    }

    // Generate video
    const result = await generateRouteVideo(routeId);

    return secureApiResponse({
      success: true,
      videoUrl: result.videoUrl,
      imagePublicIds: result.imagePublicIds,
    });
  } catch (error: any) {
    console.error('Error generating video:', error);
    return secureApiResponse(
      { error: error.message || 'Failed to generate video' },
      500
    );
  }
}
