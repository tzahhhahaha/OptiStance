import { ChevronLeft, Info, Award, Code, Heart } from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8 rounded-b-3xl">
        <button onClick={onBack} className="flex items-center gap-2 mb-4 text-white/90 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold">About the App</h1>
        <p className="text-purple-100 text-sm mt-1">Learn more about our technology</p>
      </div>

      <div className="p-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🤸</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cheerleading Pose Trainer</h2>
          <p className="text-sm text-gray-600">Version 1.0.0</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-purple-600" />
            <span>Technology</span>
          </h3>
          <div className="space-y-3">
            <div className="bg-purple-50 rounded-xl p-4">
              <h4 className="font-medium text-purple-900 mb-1">MediaPipe Pose Detection</h4>
              <p className="text-sm text-gray-600">
                Advanced real-time pose estimation using Google's MediaPipe framework.
                Detects 33 key body landmarks with high accuracy for precise pose analysis.
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <h4 className="font-medium text-purple-900 mb-1">ICU Standards Compliance</h4>
              <p className="text-sm text-gray-600">
                Follows International Cheer Union (ICU) guidelines for proper cheerleading
                form and technique evaluation.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            <span>Features</span>
          </h3>
          <ul className="space-y-2">
            {[
              'Real-time pose detection and feedback',
              'Detailed accuracy scoring system',
              'Progress tracking and history',
              'Personalized drill recommendations',
              'Comprehensive pose library',
              'Achievement and reward system',
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-purple-600 mt-0.5">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-600" />
            <span>Built With</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              'React 18',
              'TypeScript',
              'Tailwind CSS',
              'MediaPipe',
              'Vite',
              'Lucide Icons',
            ].map((tech, idx) => (
              <div key={idx} className="bg-purple-50 rounded-lg p-3 text-center">
                <span className="text-sm font-medium text-purple-900">{tech}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 mt-4 text-center">
          <Heart className="w-8 h-8 text-purple-600 mx-auto mb-2 fill-purple-600" />
          <p className="text-sm text-gray-700">
            Made with passion for cheerleaders everywhere
          </p>
        </div>
      </div>
    </div>
  );
}
