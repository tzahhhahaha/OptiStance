import { useMemo, useState } from 'react';
import { ChevronRight, Camera, Search, Filter } from 'lucide-react';
import { filterPoses, pomMotionLibrary, type PomMotion } from './poseLibrary';

interface PosePageProps {
  onOpenCamera?: () => void;
}

interface Pose extends PomMotion {}

interface PosePageProps {
  onOpenCamera?: () => void;
}

export function PosePage({ onOpenCamera }: PosePageProps) {
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const poses = useMemo(() => pomMotionLibrary, []);
  const categories = ['All', 'Stunts', 'Arm Motions', 'Jumps', 'Flexibility'];

  const filteredPoses = useMemo(() => filterPoses(poses, searchQuery, selectedCategory), [poses, searchQuery, selectedCategory]);

  if (selectedPose) {
    return (
      <div className="pb-24 bg-gradient-to-b from-purple-50 to-white min-h-screen">
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8 rounded-b-3xl">
          <button
            onClick={() => setSelectedPose(null)}
            className="mb-4 text-white/90 hover:text-white"
          >
            ← Back to Library
          </button>
          <h1 className="text-2xl font-bold mb-1">{selectedPose.name}</h1>
          <p className="text-purple-100 text-sm">{selectedPose.category}</p>
        </div>

        <div className="p-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Your Progress</p>
                <div className="text-3xl font-bold text-purple-600">{selectedPose.progress}%</div>
              </div>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="#f3e8ff"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="#9333ea"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - selectedPose.progress / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">{selectedPose.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedPose.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                selectedPose.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {selectedPose.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {selectedPose.category}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 mb-4">
            <h3 className="font-semibold mb-3">Practice Tips</h3>
            <ul className="space-y-2">
              {[
                'Warm up before attempting',
                'Focus on proper form over speed',
                'Practice in front of a mirror',
                'Record yourself for feedback'
              ].map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => alert('Drills for ' + selectedPose.name + ' - Coming soon!')}
              className="w-full bg-white rounded-xl shadow-sm border border-purple-100 p-4 flex items-center justify-between hover:bg-purple-50 transition-colors"
            >
              <span className="font-medium">View Drills</span>
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </button>

            <button
              onClick={() => onOpenCamera?.(selectedPose ?? undefined)}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl shadow-lg p-4 flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-900 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span className="font-semibold">Start Practice</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gradient-to-b from-purple-50 to-white min-h-screen">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold mb-4">Pose Library</h1>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
          <input
            type="text"
            placeholder="Search poses..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full bg-white/20 backdrop-blur-sm text-white placeholder-purple-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:bg-white/30"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-600">{filteredPoses.length} poses found</p>
          <button className="flex items-center gap-1 text-sm text-purple-600">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="grid gap-3">
          {filteredPoses.map((pose) => (
            <button
              key={pose.id}
              onClick={() => setSelectedPose(pose)}
              className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🤸</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{pose.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      pose.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                      pose.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {pose.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{pose.category}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-purple-100 rounded-full h-2">
                      <div
                        className="bg-purple-600 rounded-full h-2 transition-all"
                        style={{ width: `${pose.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-purple-600">{pose.progress}%</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
