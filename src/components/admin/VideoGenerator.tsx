import { useState } from 'react';

interface VideoGeneratorProps {
  routeId: string;
  videoUrl?: string | null;
}

export default function VideoGenerator({ routeId, videoUrl }: VideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);

  const handleGenerateVideo = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/routes/generate-video?routeId=${routeId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setCurrentVideoUrl(data.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Route Video</h3>
        <button
          type="button"
          onClick={handleGenerateVideo}
          disabled={isGenerating}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate Video'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {currentVideoUrl && (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <video
            src={currentVideoUrl}
            controls
            className="w-full h-full"
            poster="/images/book_shuttles_logo_og_banner.png"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {!currentVideoUrl && !isGenerating && (
        <p className="text-sm text-gray-500">
          No video generated yet. Click the button above to create a video for this route.
        </p>
      )}
    </div>
  );
}
