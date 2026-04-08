import { ArrowRight } from 'lucide-react';

type WelcomeScreenProps = {
  onGetStarted: () => void;
};

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="w-32 h-32 bg-purple-200 rounded-3xl flex items-center justify-center mb-6">
            <span className="text-6xl font-semibold text-purple-900">O</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            OneStop
          </h1>

          {/* Subtitle */}
          <p className="text-base text-gray-600 mb-12 leading-relaxed">
            See only the events that matter to you and your family.
          </p>

          {/* Steps */}
          <div className="w-full space-y-4 mb-12">
            <div className="flex items-center gap-4 text-left">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-purple-900">1</span>
              </div>
              <span className="text-base text-gray-900">Add your name and family</span>
            </div>

            <div className="flex items-center gap-4 text-left">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-purple-900">2</span>
              </div>
              <span className="text-base text-gray-900">Sign in with Google</span>
            </div>

            <div className="flex items-center gap-4 text-left">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-purple-900">3</span>
              </div>
              <span className="text-base text-gray-900">See your personalized schedule</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={onGetStarted}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium text-base py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            Get started
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
