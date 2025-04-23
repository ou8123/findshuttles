'use client';

import { useState } from "react";

export default function SuggestRoute() {
  const [userType, setUserType] = useState<"provider" | "traveler">("provider");

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-center mb-6">Suggest a Route</h1>
      <div className="mb-6 flex justify-center space-x-4 border-b">
        <button
          onClick={() => setUserType("provider")}
          className={`px-4 py-2 -mb-px border-b-2 ${userType === "provider" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
        >
          I'm a Shuttle Provider
        </button>
        <button
          onClick={() => setUserType("traveler")}
          className={`px-4 py-2 -mb-px border-b-2 ${userType === "traveler" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
        >
          I'm a Traveler
        </button>
      </div>

      <form
        action="/api/form-handler"
        method="POST"
        className="space-y-4"
      >
        <input type="hidden" name="type" value={userType} />
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
          <input id="name" name="name" placeholder="Your Name" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Your Email</label>
          <input id="email" name="email" type="email" placeholder="Your Email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="details" className="block text-sm font-medium text-gray-700">
            {userType === "provider" ? "Describe your route" : "Describe your ideal destination or travel plan"}
          </label>
          <textarea id="details" name="details" placeholder={`Enter details here...`} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-32 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="g-recaptcha" data-sitekey="6LcsCSIrAAAAAOvQ2_r5wrPA9fIx3e3rLPFHvK95"></div>
        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Submit Suggestion
        </button>
      </form>
    </div>
  );
}
