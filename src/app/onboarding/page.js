'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);

  const handleNext = async () => {
    try {
      setRequesting(true);
      setError('');

      // Request microphone and camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Stop the stream after getting permission
      stream.getTracks().forEach(track => track.stop());

      // Navigate to app page if permissions granted
      router.push('/app');
    } catch (err) {
      console.error('Permission denied:', err);
      setError('Please grant camera and microphone access to continue.');
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome!</h1>
          <p className="text-lg text-gray-600">
            Let's get you started with your new app.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Getting Started</h2>
            <p className="text-gray-600">
              This app requires camera and microphone access to work properly.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Camera Access</h3>
                <p className="text-sm text-gray-600">
                  We'll need access to your camera
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Microphone Access</h3>
                <p className="text-sm text-gray-600">
                  We'll need access to your microphone
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Start Using the App</h3>
                <p className="text-sm text-gray-600">
                  Click Next to grant permissions and continue
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleNext}
            disabled={requesting}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting ? 'Requesting permissions...' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
