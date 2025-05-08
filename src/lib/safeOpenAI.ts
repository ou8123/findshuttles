// lib/safeOpenAI.ts
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

  // ✅ Bail early if not JSON
  if (!res.ok || !contentType.includes('application/json')) {
    console.error('❌ OpenAI returned non-JSON or error:', raw.slice(0, 300));
    throw new Error('OpenAI response is not JSON (deployment/CDN issue?)');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Failed to parse OpenAI top-level response:', raw.slice(0, 300));
    throw new Error('Invalid JSON in OpenAI API response');
  }

  const messageContent = parsed?.choices?.[0]?.message?.content;

  if (!messageContent || typeof messageContent !== 'string') {
    console.error('❌ OpenAI message.content missing or invalid:', parsed);
    throw new Error('OpenAI response missing usable content');
  }

  try {
    // Clean potentially problematic control characters before parsing the nested JSON
    const jsonFromContent = JSON.parse(
      messageContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    );
    return jsonFromContent; // Return the successfully parsed nested JSON
  } catch (err) {
    console.error('❌ Could not parse OpenAI message.content as JSON:', messageContent.slice(0, 300));
    throw new Error('Invalid JSON inside OpenAI message.content');
  }
}