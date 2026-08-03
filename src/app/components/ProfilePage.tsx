import { User, Award, Target, Calendar, TrendingUp, Medal, Star, Upload } from 'lucide-react';
import { useState, useRef } from 'react';

export function ProfilePage() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="pb-24 bg-gradient-to-b from-purple-50 to-white min-h-screen">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-12 rounded-b-3xl">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <button
              onClick={triggerFileInput}
              className="absolute bottom-0 right-0 bg-purple-500 hover:bg-purple-600 rounded-full p-2 shadow-lg transition-colors"
              title="Upload profile picture"
            >
              <Upload className="w-4 h-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              aria-label="Upload profile image"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">Juan Dela Cruz</h2>
            <p className="text-purple-100 text-sm">juan.delacruz@email.com</p>
            <div className="flex items-center gap-2 mt-2">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span className="text-sm font-medium">Level 5 Cheerleader</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <h3 className="font-semibold mb-3">Statistics</h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-xs text-gray-500">Poses Mastered</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <div className="text-xs text-gray-500">Awards</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-xs text-gray-500">Day Streak</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 mb-4">
          <h3 className="font-semibold mb-3">Weekly Goal</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Practice 8 different poses</span>
            <span className="text-sm font-medium text-purple-600">0/8</span>
          </div>
          <div className="bg-purple-100 rounded-full h-2.5">
            <div className="bg-purple-600 rounded-full h-2.5" style={{ width: '0%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Start practicing to reach your goal! 🎯</p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-8 mb-4 text-center">
          <div className="text-gray-400 mb-2">
            <TrendingUp className="w-12 h-12 mx-auto opacity-50" />
          </div>
          <p className="text-gray-500 text-sm">No activity yet</p>
          <p className="text-gray-400 text-xs mt-1">Start practicing to see your progress here!</p>
        </div>

        <h3 className="font-semibold mb-3">Achievements</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { icon: '🏆', label: 'First Win', unlocked: false },
            { icon: '🥇', label: 'Gold Star', unlocked: false },
            { icon: '⭐', label: 'Top Scorer', unlocked: false },
            { icon: '🎯', label: 'Perfect 10', unlocked: false },
            { icon: '🔥', label: 'Hot Streak', unlocked: false },
            { icon: '💪', label: 'Strong Form', unlocked: false },
            { icon: '🌟', label: 'Rising Star', unlocked: false },
            { icon: '✨', label: 'Excellence', unlocked: false },
          ].map((achievement, idx) => (
            <div
              key={idx}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-300'
                  : 'bg-gray-100 border-2 border-gray-200 opacity-50'
              }`}
            >
              <div className="text-2xl mb-0.5">{achievement.icon}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
