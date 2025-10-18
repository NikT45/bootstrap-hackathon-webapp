'use client';

import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/app');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome!</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Let's get you started with your new app.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Getting Started</h2>
            <p className="text-gray-600 dark:text-gray-400">
              This is your onboarding page. Customize it with your own content, steps, or information.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">First Step</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add your first onboarding step here
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Second Step</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add your second onboarding step here
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Third Step</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add your third onboarding step here
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
