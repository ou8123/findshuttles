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
    console.error('❌ OpenAI returned non-JSON or error response:');
    console.error(raw.slice(0, 300)); // Log more context on error
    throw new Error(`OpenAI API Error: Status ${res.status}. Response: ${raw.slice(0, 100)}...`);
  }

  // First, parse the overall JSON response from OpenAI
  let parsedOuterResponse;
  try {
      parsedOuterResponse = JSON.parse(raw);
  } catch (err) {
      console.error('❌ Failed to parse the main OpenAI JSON response:');
      console.error(raw);
      throw new Error('Invalid JSON structure in OpenAI main response');
  }

  // Extract the nested content string
  const content = parsedOuterResponse?.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    console.error('❌ OpenAI response missing expected content string:');
    console.error('Parsed Outer Response:', JSON.stringify(parsedOuterResponse, null, 2)); // Log structure
    throw new Error('OpenAI response missing expected content string in choices[0].message.content');
  }

  // Now, parse the nested JSON *within* the content string
  try {
    // Clean potentially problematic control characters before parsing the nested JSON
    const cleanedContent = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    const jsonContent = JSON.parse(cleanedContent);
    return jsonContent; // Return the successfully parsed nested JSON
  } catch (err) {
    console.error('❌ Failed to parse OpenAI message.content as JSON:');
    console.error('Raw message.content:', content.slice(0, 500)); // Log more of the problematic content
    throw new Error('Invalid JSON in OpenAI message.content');
  }
}