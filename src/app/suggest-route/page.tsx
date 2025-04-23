'use client';

import { useState, FormEvent, useRef } from "react"; // Import useRef

// Declare grecaptcha type for TypeScript
declare global {
  interface Window {
    grecaptcha: any; // Use 'any' for simplicity, or install @types/grecaptcha for better typing
  }
}

export default function SuggestRoute() {
  const [userType, setUserType] = useState<"provider" | "traveler">("provider");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null); // Create form ref

  const siteKey = "6LcsCSIrAAAAAOvQ2_r5wrPA9fIx3e3rLPFHvK95"; // Enterprise Site Key

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    if (!window.grecaptcha || !window.grecaptcha.enterprise) {
      setSubmitStatus({ type: 'error', message: 'reCAPTCHA script not loaded yet. Please try again.' });
      setIsSubmitting(false);
      return;
    }

    // Wrap the core logic in the ready callback
    window.grecaptcha.enterprise.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise.execute(siteKey, { action: 'SUGGEST_ROUTE' });

        // Use the ref to get the form element reliably
        if (!formRef.current) {
          throw new Error("Form reference is not available.");
        }
        const formData = new FormData(formRef.current); // Use the ref here
      const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        details: formData.get('details') as string,
        type: userType, // Use state variable directly instead of formData.get('type')
        recaptchaToken: token, // Include the Enterprise token
      };

      const response = await fetch('/api/form-handler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

        setSubmitStatus({ type: 'success', message: 'Suggestion submitted successfully! Thank you.' });
        // Optionally reset the form: formElement.reset();

      } catch (error: any) {
        console.error('Submission error:', error);
        setSubmitStatus({ type: 'error', message: `Submission failed: ${error.message || 'Please try again.'}` });
      } finally {
        // Ensure isSubmitting is set to false regardless of success/error inside ready()
        setIsSubmitting(false);
      }
    });
    // Note: setIsSubmitting(false) is now inside the ready() callback's finally block
    // to ensure it runs *after* the async operations complete.
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-center mb-6">Suggest a Route</h1>
      <div className="mb-6 flex justify-center space-x-4 border-b">
        <button
          onClick={() => setUserType("provider")}
          disabled={isSubmitting}
          className={`px-4 py-2 -mb-px border-b-2 ${userType === "provider" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} disabled:opacity-50`}
        >
          I'm a Shuttle Provider
        </button>
        <button
          onClick={() => setUserType("traveler")}
          disabled={isSubmitting}
          className={`px-4 py-2 -mb-px border-b-2 ${userType === "traveler" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} disabled:opacity-50`}
        >
          I'm a Traveler
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4"> {/* Attach ref */}
        <input type="hidden" name="type" value={userType} />
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
          <input id="name" name="name" placeholder="Your Name" required disabled={isSubmitting} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Your Email</label>
          <input id="email" name="email" type="email" placeholder="Your Email" required disabled={isSubmitting} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
        </div>
        <div>
          <label htmlFor="details" className="block text-sm font-medium text-gray-700">
            {userType === "provider" ? "Describe your route" : "Describe your ideal destination or travel plan"}
          </label>
          <textarea id="details" name="details" placeholder={`Enter details here...`} required disabled={isSubmitting} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-32 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
        </div>

        {/* Submission status message */}
        {submitStatus && (
          <div className={`p-3 rounded-md text-sm ${submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {submitStatus.message}
          </div>
        )}

        {/* Removed the old reCAPTCHA div */}
        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          This site is protected by reCAPTCHA Enterprise and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a> apply.
        </p>
      </form>
    </div>
  );
}
