import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Shield, MoreVertical, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabaseGetUsers, supabaseDeleteUser, supabaseUpdateUserRole, supabaseSignUp } from '../../../services/supabaseApi';

interface Athlete {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'admin';
  sessions: number;
  avgAccuracy: number;
  status: 'active' | 'inactive';
  joinDate: string;
}

export default function DarkAdminUsers() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const users = await supabaseGetUsers();
      setAthletes(users.map((u: any) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: u.role === 'SystemManager' ? 'admin' : 'athlete',
        sessions: 0,
        avgAccuracy: 0,
        status: 'active',
        joinDate: u.createdAt ? u.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      })));
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabaseDeleteUser(id);
      setAthletes(prev => prev.filter(a => a.id !== id));
      if (selectedAthlete?.id === id) setSelectedAthlete(null);
    } catch (e) {
      console.error('Failed to delete user:', e);
      setActionError('Failed to remove athlete. Please try again.');
    }
  };

  const handleRoleChange = async (athlete: Athlete) => {
    const nextRole: Athlete['role'] = athlete.role === 'admin' ? 'athlete' : 'admin';
    try {
      await supabaseUpdateUserRole(athlete.id, nextRole);
      const updated = { ...athlete, role: nextRole };
      setAthletes(prev => prev.map(a => (a.id === athlete.id ? updated : a)));
      setSelectedAthlete(updated);
    } catch (e) {
      console.error('Failed to update role:', e);
      setActionError('Failed to update role. Please try again.');
    }
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 8) {
      setActionError('Provide a name, a valid email, and a password of at least 8 characters.');
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      const { user } = await supabaseSignUp(newName, newEmail, newPassword);
      setAthletes(prev => [
        {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: 'athlete' as const,
          sessions: 0,
          avgAccuracy: 0,
          status: 'active' as const,
          joinDate: new Date().toISOString().split('T')[0],
        },
        ...prev,
      ]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add athlete.');
    } finally {
      setIsSaving(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredAthletes = athletes.filter(
    a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {loading && (
        <p className="text-sm text-zinc-500 py-8 text-center">Loading athletes…</p>
      )}
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Athlete Management</h3>
          <p className="text-sm text-zinc-400 mt-1">Manage roles, permissions, and view athlete profiles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
        >
          + Add Athlete
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
        />
      </div>

      {/* Athletes Table */}
      <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Name</th>
                <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Email</th>
                <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Role</th>
                <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Sessions</th>
                <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Accuracy</th>
                <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 text-center font-bold text-white uppercase tracking-wider text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredAthletes.map((athlete) => (
                <tr
                  key={athlete.id}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => setSelectedAthlete(athlete)}
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{athlete.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-zinc-400 text-xs">{athlete.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${
                      athlete.role === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {athlete.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">{athlete.sessions}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-white/[0.1] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" 
                          style={{width: `${athlete.avgAccuracy}%`}}
                        />
                      </div>
                      <span className="text-white font-bold text-xs">{athlete.avgAccuracy}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {athlete.status === 'active' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 text-xs font-bold">Active</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-zinc-500" />
                          <span className="text-zinc-400 text-xs font-bold">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedAthlete(athlete); }}
                        className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-all"
                        title="View athlete"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Remove ${athlete.name}? Their account will be deactivated.`)) {
                            void handleDelete(athlete.id);
                          }
                        }}
                        className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all"
                        title="Remove athlete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedAthlete(athlete); }}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 transition-all"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Athlete Detail Modal */}
      {selectedAthlete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            <div className="p-8 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white">{selectedAthlete.name}</h3>
                <p className="text-sm text-zinc-400 mt-1">{selectedAthlete.email}</p>
              </div>
              <button
                onClick={() => setSelectedAthlete(null)}
                className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Total Sessions</p>
                  <p className="text-2xl font-black text-white">{selectedAthlete.sessions}</p>
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Avg Accuracy</p>
                  <p className="text-2xl font-black text-emerald-400">{selectedAthlete.avgAccuracy}%</p>
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Member Since</p>
                  <p className="text-sm font-bold text-white">{new Date(selectedAthlete.joinDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleRoleChange(selectedAthlete)}
                  className="flex-1 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold transition-all"
                >
                  {selectedAthlete.role === 'admin' ? 'Demote to Athlete' : 'Promote to Admin'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Remove ${selectedAthlete.name}? Their account will be deactivated.`)) {
                      void handleDelete(selectedAthlete.id);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all"
                >
                  Remove
                </button>
                <button
                  onClick={() => setSelectedAthlete(null)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 font-bold transition-all"
                >
                  Close
                </button>
              </div>
              {actionError && <p className="text-xs text-rose-400 mt-3">{actionError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Add Athlete Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-md overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Add Athlete</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddAthlete} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Temporary Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold disabled:opacity-60 transition-all"
              >
                {isSaving ? 'Creating...' : 'Create Athlete Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
