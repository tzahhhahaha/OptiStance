import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye, Grid3x3, List, Video, MessageSquare, AlertCircle } from 'lucide-react';

interface Stunt {
  id: string;
  name: string;
  category: 'stunt' | 'jump' | 'tumbling' | 'pom_motion';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  refImage: string;
  coachingTips: string;
  attempts: number;
  masteryRate: number;
}

const mockStunts: Stunt[] = [
  { id: '1', name: 'Liberty', category: 'stunt', difficulty: 'advanced', refImage: '📸', coachingTips: 'Keep base leg locked', attempts: 342, masteryRate: 78 },
  { id: '2', name: 'Scorpion', category: 'stunt', difficulty: 'advanced', refImage: '📸', coachingTips: 'Full body extension', attempts: 298, masteryRate: 65 },
  { id: '3', name: 'High V', category: 'pom_motion', difficulty: 'beginner', refImage: '📸', coachingTips: 'Lock elbows completely', attempts: 512, masteryRate: 92 },
  { id: '4', name: 'Heel Stretch', category: 'stunt', difficulty: 'advanced', refImage: '📸', coachingTips: 'Pointed toe extension', attempts: 187, masteryRate: 71 },
];

export default function DarkAdminContent() {
  const [stunts, setStunts] = useState<Stunt[]>(mockStunts);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStunt, setSelectedStunt] = useState<Stunt | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const difficultyColors = {
    beginner: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    intermediate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    advanced: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  const categoryIcons = {
    stunt: '🏄',
    jump: '🦘',
    tumbling: '🤸',
    pom_motion: '📍',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Stunt Syllabus</h3>
          <p className="text-sm text-zinc-400 mt-1">Create, edit, and manage all poses and stunts</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Stunt
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            viewMode === 'grid'
              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
              : 'bg-white/[0.05] text-zinc-400 border border-white/[0.08]'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          Grid
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            viewMode === 'list'
              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
              : 'bg-white/[0.05] text-zinc-400 border border-white/[0.08]'
          }`}
        >
          <List className="w-4 h-4" />
          List
        </button>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stunts.map((stunt) => (
            <div
              key={stunt.id}
              onClick={() => setSelectedStunt(stunt)}
              className="group bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer overflow-hidden"
            >
              {/* Image */}
              <div className="w-full h-32 bg-white/[0.02] rounded-xl mb-4 flex items-center justify-center text-4xl border border-white/[0.05]">
                {categoryIcons[stunt.category]}
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-white">{stunt.name}</h4>
                    <p className="text-xs text-zinc-500 capitalize mt-1">{stunt.category.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${difficultyColors[stunt.difficulty]}`}>
                    {stunt.difficulty}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 py-3 border-t border-white/[0.05]">
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">Attempts</p>
                    <p className="text-sm font-black text-white">{stunt.attempts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">Mastery Rate</p>
                    <p className="text-sm font-black text-emerald-400">{stunt.masteryRate}%</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="flex-1 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1">
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1">
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Name</th>
                  <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Category</th>
                  <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Difficulty</th>
                  <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Attempts</th>
                  <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Mastery</th>
                  <th className="px-6 py-4 text-center font-bold text-white uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {stunts.map((stunt) => (
                  <tr key={stunt.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-bold text-white">{stunt.name}</td>
                    <td className="px-6 py-4 text-zinc-400 capitalize text-sm">{stunt.category.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${difficultyColors[stunt.difficulty]}`}>
                        {stunt.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">{stunt.attempts}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-white/[0.1] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" 
                            style={{width: `${stunt.masteryRate}%`}}
                          />
                        </div>
                        <span className="text-white font-bold text-xs">{stunt.masteryRate}%</span>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stunt Detail Modal */}
      {selectedStunt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            <div className="p-8 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-2xl font-black text-white">{selectedStunt.name}</h3>
              <button
                onClick={() => setSelectedStunt(null)}
                className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Coaching Tips */}
              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                <p className="text-xs text-zinc-500 font-bold mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Coaching Tips
                </p>
                <p className="text-sm text-white">{selectedStunt.coachingTips}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Total Attempts</p>
                  <p className="text-3xl font-black text-white">{selectedStunt.attempts}</p>
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Mastery Rate</p>
                  <p className="text-3xl font-black text-emerald-400">{selectedStunt.masteryRate}%</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button className="flex-1 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold transition-all">
                  Edit Stunt
                </button>
                <button className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
