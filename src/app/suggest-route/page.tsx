'use client';

import { useState, FormEvent, useRef } from "react";

// Removed grecaptcha declaration

export default function SuggestRoute() {
  const [userType, setUserType] = useState<"provider" | "traveler">("provider");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false); // State for simple checkbox
  const formRef = useRef<HTMLFormElement>(null);

  // Removed siteKey constant

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // --- Check simple verification checkbox ---
    if (!isVerified) {
      setSubmitStatus({ type: 'error', message: 'Please confirm you are not a robot.' });
      setIsSubmitting(false);
      return;
    }

    // --- Get form values ---
    if (!formRef.current) {
      setSubmitStatus({ type: 'error', message: 'Form reference error. Please try again.' });
      setIsSubmitting(false);
      return;
    }
    const currentForm = formRef.current;
    const nameValue = (currentForm.elements.namedItem('name') as HTMLInputElement)?.value;
    const emailValue = (currentForm.elements.namedItem('email') as HTMLInputElement)?.value;
    const detailsValue = (currentForm.elements.namedItem('details') as HTMLTextAreaElement)?.value;

    // Removed grecaptcha logic (ready, execute)

    try {
      // Construct data without reCAPTCHA token
      const data = {
        name: nameValue,
        email: emailValue,
        details: detailsValue,
        type: userType,
        // recaptchaToken removed
      };

      // Log the data being sent
      console.log('Sending data to API:', data);

      const response = await fetch('/api/form-handler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Use error message from API if available, otherwise generic message
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      setSubmitStatus({ type: 'success', message: 'Suggestion submitted successfully! Thank you.' });
      // Optionally reset the form
      currentForm.reset();
      setIsVerified(false); // Reset verification checkbox state

    } catch (error: any) {
      console.error('Submission error:', error);
      setSubmitStatus({ type: 'error', message: `Submission failed: ${error.message || 'Please try again.'}` });
    } finally {
      setIsSubmitting(false);
    }
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

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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

        {/* Simple "I am not a robot" checkbox */}
        <div className="flex items-center">
          <input
            id="verification"
            name="verification"
            type="checkbox"
            checked={isVerified}
            onChange={(e) => setIsVerified(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="verification" className="ml-2 block text-sm text-gray-900">
            I am not a robot
          </label>
        </div>

        {/* Submission status message */}
        {submitStatus && (
          <div className={`p-3 rounded-md text-sm ${submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {submitStatus.message}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || !isVerified} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
        </button>
        {/* Removed Google reCAPTCHA terms paragraph */}
      </form>
    </div>
  );
}
