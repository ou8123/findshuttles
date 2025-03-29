export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

    document.body.appendChild(script);
  });
}

export function loadScriptContent(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.textContent = content;
      document.body.appendChild(script);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function extractScripts(html: string): { scripts: string[]; inlineScripts: string[]; remainingHtml: string } {
  const scripts: string[] = [];
  const inlineScripts: string[] = [];
  let remainingHtml = html;

  // Extract scripts with src
  const srcRegex = /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/g;
  remainingHtml = remainingHtml.replace(srcRegex, (match, src) => {
    scripts.push(src);
    return '';
  });

  // Extract inline scripts
  const inlineRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
  remainingHtml = remainingHtml.replace(inlineRegex, (match, content) => {
    if (content.trim()) {
      inlineScripts.push(content);
    }
    return '';
  });

  return { scripts, inlineScripts, remainingHtml };
}