type ScriptStatus = {
  loaded: boolean;
  error: boolean;
  promise?: Promise<void>;
};

const scripts: { [src: string]: ScriptStatus } = {};

export const loadScript = (src: string): Promise<void> => {
  if (!scripts[src]) {
    scripts[src] = {
      loaded: false,
      error: false,
      promise: new Promise((resolve, reject) => {
        // Create script element
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = src;

        // Add event listeners
        script.onload = () => {
          scripts[src].loaded = true;
          resolve();
        };

        script.onerror = () => {
          scripts[src].error = true;
          reject(new Error(`Failed to load script: ${src}`));
        };

        // Append script to document
        document.head.appendChild(script);
      }),
    };
  }

  return scripts[src].promise!;
};

export const loadScripts = async (srcs: string[]): Promise<void> => {
  try {
    await Promise.all(srcs.map(src => loadScript(src)));
  } catch (error) {
    console.error('Failed to load scripts:', error);
    throw error;
  }
};

export const injectInlineScript = (content: string): void => {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = content;
  document.head.appendChild(script);
};