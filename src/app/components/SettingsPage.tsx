import { ChevronLeft, User, Bell, Shield, Lock, Globe, Moon, X } from 'lucide-react';
import { useState } from 'react';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@email.com',
  });
  const [privacySettings, setPrivacySettings] = useState({
    showActivity: true,
    allowMessages: true,
    profileVisibility: 'public',
  });

  const handleEditProfile = () => {
    setActiveModal('edit-profile');
  };

  const handleChangePassword = () => {
    setActiveModal('change-password');
  };

  const handleNotifications = () => {
    setActiveModal('notifications');
  };

  const handlePrivacySettings = () => {
    setActiveModal('privacy');
  };

  const handleSecuritySettings = () => {
    setActiveModal('security');
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8 rounded-b-3xl">
        <button onClick={onBack} className="flex items-center gap-2 mb-4 text-white/90 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold">Settings & Privacy</h1>
        <p className="text-purple-100 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="p-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <h3 className="font-semibold mb-3 text-gray-700">Account Settings</h3>
          <div className="space-y-1">
            {[
              { icon: User, label: 'Edit Profile', description: 'Update your personal information', action: handleEditProfile },
              { icon: Lock, label: 'Change Password', description: 'Update your password', action: handleChangePassword },
              { icon: Bell, label: 'Notifications', description: 'Manage notification preferences', action: handleNotifications },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <h3 className="font-semibold mb-3 text-gray-700">Privacy & Security (ISO 25010)</h3>
          <div className="space-y-1">
            {[
              { icon: Shield, label: 'Privacy Settings', description: 'Control who can see your activity', action: handlePrivacySettings },
              { icon: Lock, label: 'Security Settings', description: 'Two-factor authentication & more', action: handleSecuritySettings },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h3 className="font-semibold mb-3 text-gray-700">Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Language</div>
                  <div className="text-xs text-gray-500">English (US)</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('language')}
                className="text-purple-600 text-sm font-medium hover:text-purple-800"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Dark Mode</div>
                  <div className="text-xs text-gray-500">{darkMode ? 'Currently on' : 'Currently off'}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'edit-profile' && (
        <ModalOverlay onClose={closeModal}>
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  defaultValue={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  defaultValue={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  closeModal();
                  alert('Profile updated successfully!');
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {activeModal === 'change-password' && (
        <ModalOverlay onClose={closeModal}>
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  closeModal();
                  alert('Password changed successfully!');
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                Update
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {activeModal === 'notifications' && (
        <ModalOverlay onClose={closeModal}>
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <span className="text-gray-700 font-medium">Email Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <span className="text-gray-700 font-medium">Push Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
            <button
              onClick={() => {
                closeModal();
                alert('Notification settings updated!');
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Save
            </button>
          </div>
        </ModalOverlay>
      )}

      {activeModal === 'privacy' && (
        <ModalOverlay onClose={closeModal}>
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Privacy Settings</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <span className="text-gray-700 font-medium">Show Activity</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={privacySettings.showActivity}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, showActivity: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <span className="text-gray-700 font-medium">Allow Messages</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={privacySettings.allowMessages}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, allowMessages: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Visibility</label>
                <select 
                  value={privacySettings.profileVisibility}
                  onChange={(e) => setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="friends-only">Friends Only</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                closeModal();
                alert('Privacy settings updated!');
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Save
            </button>
          </div>
        </ModalOverlay>
      )}

      {activeModal === 'security' && (
        <ModalOverlay onClose={closeModal}>
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <span className="text-gray-700 font-medium block">Two-Factor Authentication</span>
                  <span className="text-xs text-gray-500">Adds an extra layer of security</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={twoFactorAuth}
                    onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">✓ Your account uses strong encryption for data protection (ISO 25010 compliant).</p>
              </div>
            </div>
            <button
              onClick={() => {
                closeModal();
                alert('Security settings updated!');
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Save
            </button>
          </div>
        </ModalOverlay>
      )}

      {activeModal === 'language' && (
        <ModalOverlay onClose={closeModal}>
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Language Settings</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2 mb-6">
              {['English (US)', 'Spanish', 'French', 'Filipino (Tagalog)', 'German'].map((lang, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    closeModal();
                    alert(`Language changed to ${lang}`);
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-colors"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
