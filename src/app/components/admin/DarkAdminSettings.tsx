import React, { useState } from 'react';
import { Settings, Bell, Lock, Database, Zap, Volume2, Save, RotateCcw } from 'lucide-react';

interface SettingItem {
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'input';
  value: boolean | string;
  options?: string[];
}

export default function DarkAdminSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    debugMode: false,
    dataBackup: true,
    maxUploadSize: '500',
    scoringMode: 'icu',
    audioFeedback: true,
  });

  const [saved, setSaved] = useState(false);

  const handleToggle = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const settingGroups = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive email alerts for important events',
          type: 'toggle' as const,
        },
      ],
    },
    {
      title: 'Scoring & Performance',
      icon: Zap,
      items: [
        {
          key: 'scoringMode',
          label: 'Scoring Mode',
          description: 'Select how pose accuracy is calculated',
          type: 'select' as const,
          options: ['icu', 'percentage', 'hybrid'],
        },
        {
          key: 'audioFeedback',
          label: 'Audio Feedback',
          description: 'Enable voice coaching cues during practice',
          type: 'toggle' as const,
        },
      ],
    },
    {
      title: 'Storage & Database',
      icon: Database,
      items: [
        {
          key: 'maxUploadSize',
          label: 'Max Upload Size (MB)',
          description: 'Maximum file size for video uploads',
          type: 'input' as const,
        },
        {
          key: 'dataBackup',
          label: 'Automatic Backups',
          description: 'Automatically backup database daily',
          type: 'toggle' as const,
        },
      ],
    },
    {
      title: 'Development',
      icon: Settings,
      items: [
        {
          key: 'debugMode',
          label: 'Debug Mode',
          description: 'Enable detailed logging and debugging tools',
          type: 'toggle' as const,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-black text-white tracking-tight">Settings & Configuration</h3>
        <p className="text-sm text-zinc-400 mt-1">Manage platform settings, notifications, and system configuration</p>
      </div>

      {/* Settings Sections */}
      {settingGroups.map((group, groupIdx) => {
        const GroupIcon = group.icon;
        return (
          <div key={groupIdx} className="space-y-3">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border border-white/[0.08] flex items-center justify-center">
                <GroupIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">{group.title}</h4>
            </div>

            {/* Settings Items */}
            <div className="space-y-3">
              {group.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] hover:border-white/[0.12] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{item.label}</p>
                      <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
                    </div>

                    {/* Controls */}
                    <div className="ml-6">
                      {item.type === 'toggle' && (
                        <button
                          onClick={() => handleToggle(item.key)}
                          className={`relative w-14 h-7 rounded-full transition-all ${
                            settings[item.key as keyof typeof settings] ? 'bg-emerald-500/30 border-emerald-500/50' : 'bg-white/[0.05] border-white/[0.08]'
                          } border`}
                        >
                          <div
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${
                              settings[item.key as keyof typeof settings] ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}

                      {item.type === 'select' && (
                        <select
                          value={settings[item.key as keyof typeof settings]}
                          onChange={(e) => handleChange(item.key, e.target.value)}
                          className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm font-medium focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                        >
                          {item.options?.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#0d0d12] text-white">
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </option>
                          ))}
                        </select>
                      )}

                      {item.type === 'input' && (
                        <input
                          type="text"
                          value={settings[item.key as keyof typeof settings]}
                          onChange={(e) => handleChange(item.key, e.target.value)}
                          className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm font-medium w-24 focus:outline-none focus:border-indigo-500/50"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* System Info */}
      <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">System Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'API Version', value: '1.2.0' },
            { label: 'Database', value: 'Supabase PostgreSQL' },
            { label: 'Last Backup', value: 'Today at 2:30 AM' },
            { label: 'Storage Used', value: '2.4 GB / 10 GB' },
          ].map((info, idx) => (
            <div key={idx} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
              <p className="text-xs text-zinc-500 font-medium mb-1">{info.label}</p>
              <p className="text-sm font-bold text-white">{info.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-white/[0.08]">
        <button
          onClick={handleSave}
          className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            saved
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border border-indigo-500/50'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <button
          onClick={() => {
            setSettings({
              emailNotifications: true,
              debugMode: false,
              dataBackup: true,
              maxUploadSize: '500',
              scoringMode: 'icu',
              audioFeedback: true,
            });
          }}
          className="px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white font-bold transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
  );
}
