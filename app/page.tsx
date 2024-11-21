'use client'

import { useAuth } from './contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <section className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-5xl font-bold mb-6">
          Create Engaging Quizzes with AI
        </h1>
        <p className="text-xl mb-12 text-gray-600 dark:text-gray-400">
          Our AI-powered platform helps you create professional quizzes in minutes. 
          Perfect for educators, trainers, and content creators looking to engage their audience.
        </p>
        {user ? (
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors text-lg inline-block"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            href="/register"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-colors text-lg inline-block"
          >
            Get Started
          </Link>
        )}
      </section>
    </div>
  );
}

