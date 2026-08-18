import React, { useState } from 'react';
import { Search, Edit, Trash2, Shield, Award, Clock, MoreVertical, CheckCircle, AlertCircle } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'coach' | 'admin';
  sessions: number;
  avgAccuracy: number;
  status: 'active' | 'inactive';
  joinDate: string;
}

const mockAthletes: Athlete[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'athlete', sessions: 24, avgAccuracy: 87, status: 'active', joinDate: '2024-01-15' },
  { id: '2', name: 'Emma Davis', email: 'emma@example.com', role: 'athlete', sessions: 18, avgAccuracy: 92, status: 'active', joinDate: '2024-02-20' },
  { id: '3', name: 'Jessica Lee', email: 'jessica@example.com', role: 'coach', sessions: 42, avgAccuracy: 95, status: 'active', joinDate: '2023-12-10' },
];

export default function DarkAdminUsers() {
  const [athletes, setAthletes] = useState<Athlete[]>(mockAthletes);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  const filteredAthletes = athletes.filter(
    a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Athlete Management</h3>
          <p className="text-sm text-zinc-400 mt-1">Manage roles, permissions, and view athlete profiles</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
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
                      athlete.role === 'coach' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
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
                      <button className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 transition-all">
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
                <button className="flex-1 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold transition-all">
                  View Profile
                </button>
                <button className="flex-1 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold transition-all">
                  Change Role
                </button>
                <button className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
