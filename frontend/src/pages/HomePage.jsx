// src/pages/HomePage.jsx
import React from 'react';
import Navbar from '../components/layout/Navbar'; // import navbar

export default function HomePage() {
  return (
    <div className="pt-20 min-h-screen bg-blue-50 flex flex-col items-center justify-center text-center px-4">
      <Navbar />
      <h1 className="text-4xl sm:text-5xl font-bold text-blue-800 mb-6">Welcome to MumbaiMitra 🌊</h1>
      <p className="text-lg sm:text-xl text-gray-700 max-w-xl mb-8">
        Join the movement to clean and preserve Mumbai's iconic beaches. Volunteer for upcoming events or organize your own initiatives using our AI-powered civic-tech platform.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        <a href="/signup" className="px-6 py-3 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">
          Join as Volunteer/Organizer
        </a>
        <a href="/login" className="px-6 py-3 bg-gray-200 text-blue-700 rounded shadow hover:bg-gray-300 transition">
          Already Registered? Login
        </a>
      </div>
    </div>
  );
}
