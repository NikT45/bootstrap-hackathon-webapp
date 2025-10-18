export default function App() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Main App</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome to your application!
          </p>
        </header>

        <main className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400">
              This is your main app page. Start building your features here.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Feature 1</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add your first feature here
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Feature 2</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add your second feature here
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Feature 3</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add your third feature here
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
