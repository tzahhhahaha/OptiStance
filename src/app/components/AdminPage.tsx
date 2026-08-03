import React, { useState } from 'react';
import { X } from 'lucide-react';
import AdminUsers from './admin/AdminUsers';
import AdminContent from './admin/AdminContent';
import AdminAnalytics from './admin/AdminAnalytics';

interface AdminPageProps {
  onBack: () => void;
  isAdmin: boolean;
  userName?: string;
}

export function AdminPage({ onBack, isAdmin, userName = '' }: AdminPageProps) {
  const [tab, setTab] = useState<'users' | 'content' | 'analytics'>('users');

  if (!isAdmin) {
    return (
      <div className="p-8 min-h-screen bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Admin</h1>
            <button onClick={onBack} className="p-2 rounded-lg bg-gray-100">Back</button>
          </div>
          <div className="p-6 bg-red-50 border border-red-100 rounded-lg">
            <h2 className="font-medium mb-2">Access denied</h2>
            <p className="text-sm text-gray-600">Your account ({userName}) does not have administrator privileges.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Admin Console</h1>
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-2 rounded-lg bg-gray-100">Back</button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <button className={`px-3 py-2 rounded ${tab === 'users' ? 'bg-gray-200' : 'bg-gray-100'}`} onClick={() => setTab('users')}>Users</button>
            <button className={`px-3 py-2 rounded ${tab === 'content' ? 'bg-gray-200' : 'bg-gray-100'}`} onClick={() => setTab('content')}>Content</button>
            <button className={`px-3 py-2 rounded ${tab === 'analytics' ? 'bg-gray-200' : 'bg-gray-100'}`} onClick={() => setTab('analytics')}>Analytics</button>
          </div>
        </div>

        <div>
          {tab === 'users' && <AdminUsers />}
          {tab === 'content' && <AdminContent />}
          {tab === 'analytics' && <AdminAnalytics />}
        </div>
      </div>
    </div>
  );
}
        