import { AlertCircle } from 'lucide-react';

type AuthErrorScreenProps = {
  error?: string;
  errorDescription?: string;
};

export default function AuthErrorScreen({ error, errorDescription }: AuthErrorScreenProps) {
  const handleTryAgain = () => {
    // Clear any existing session data
    localStorage.clear();

    // Redirect to auth with retry flag to force account selection
    window.location.href = '/api/auth/start?retry=true';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Authentication Failed
        </h1>

        {error === 'org_internal' ? (
          <>
            <p className="text-base text-gray-600 mb-6">
              This app is restricted to authorized users only. The account you tried to sign in with doesn't have access.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700 font-medium mb-2">
                Why am I seeing this?
              </p>
              <p className="text-sm text-gray-600">
                The Google account you selected is not authorized to access this organization's schedule. Please contact your administrator if you believe you should have access.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-base text-gray-600 mb-4">
              We couldn't sign you in. Please try again.
            </p>
            {errorDescription && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">{errorDescription}</p>
              </div>
            )}
          </>
        )}

        <button
          onClick={handleTryAgain}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-full transition-colors"
        >
          Try with a different account
        </button>

        <p className="mt-4 text-sm text-gray-500">
          You'll be able to choose a different Google account
        </p>
      </div>
    </div>
  );
}
