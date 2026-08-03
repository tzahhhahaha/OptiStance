import { TrendingUp, Star, Upload } from 'lucide-react';

interface HomePageProps {
  onOpenCamera?: () => void;
  onNavigate?: (page: string) => void;
}

export function HomePage({ onOpenCamera, onNavigate }: HomePageProps) {
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        (async () => {
          try {
            const { uploadImage } = await import('../../styles/services/storageService');
            const url = await uploadImage(file);
            console.log('Uploaded image URL:', url);
          } catch (err) {
            console.error('Upload failed:', err);
          }
        })();
      }
    };
    input.click();
  };

  return (
    <div className="p-4 pb-24 bg-gradient-to-b from-purple-50 to-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl mb-2">Hi Cheerleader! 👋</h1>
        <p className="text-gray-600 text-sm">Track your progress and perfect your poses</p>
      </div>

      <section className="mb-6">
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90 mb-1">Weekly Progress</p>
              <div className="text-4xl font-bold">0%</div>
            </div>
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                0%
              </div>
            </div>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-xs opacity-90 mb-1">0 of 8 poses mastered</p>
            <div className="bg-white/20 rounded-full h-1.5">
              <div className="bg-white rounded-full h-1.5" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Daily Practice</h2>
          <button
            onClick={() => onNavigate?.('pose')}
            className="text-purple-600 text-sm hover:text-purple-800 font-medium"
          >
            View all
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-purple-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Liberty Pose</h3>
              <p className="text-xs text-gray-500">Recommended for today</p>
            </div>
          </div>
          <button
            onClick={onOpenCamera}
            className="w-full bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Start Practice
          </button>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-3">My Progress</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <p className="text-xs text-gray-500 mt-1">Poses Learned</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <p className="text-xs text-gray-500 mt-1">Practice Days</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">0%</div>
            <p className="text-xs text-gray-500 mt-1">Avg Score</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenCamera}
            className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 flex flex-col items-center justify-center hover:bg-purple-50 transition-colors"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium">Real-time Scan</span>
          </button>
          <button onClick={handleUpload} className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 flex flex-col items-center justify-center hover:bg-purple-50 transition-colors">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium">Upload Image</span>
          </button>
        </div>
      </section>
    </div>
  );
}
