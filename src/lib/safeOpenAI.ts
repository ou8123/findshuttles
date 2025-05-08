export async function callOpenAISafe({
  url,
  apiKey,
  payload,
}: {
  url: string;
  apiKey: string;
  payload: Record<string, any>;
}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();

  if (!res.ok || !contentType.includes('application/json')) {
    console.error('⚠️ OpenAI returned non-JSON or error response:');
    console.error(raw.slice(0, 500)); // Log first 500 characters
    // Consider throwing a more specific error or returning a structured error object
    throw new Error(`OpenAI API Error: Status ${res.status}. Response: ${raw.slice(0, 100)}...`);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ JSON parsing error:');
    console.error(raw); // Log the full raw response on parsing failure
    throw new Error('Failed to parse OpenAI JSON response');
  }
}