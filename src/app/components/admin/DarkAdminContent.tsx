import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Grid3x3, List, MessageSquare, X, AlertCircle } from 'lucide-react';
import { supabaseGetStunts, supabaseDeleteStunt, supabaseCreateStunt, supabaseUpdateStunt } from '../../../services/supabaseApi';
import type { StuntCategory, DifficultyTier } from '../../../types/supabase';

interface Stunt {
  id: string;
  name: string;
  category: StuntCategory;
  difficulty: DifficultyTier;
  refImage: string;
  coachingTips: string;
  attempts: number;
  masteryRate: number;
}

export default function DarkAdminContent() {
  const [stunts, setStunts] = useState<Stunt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStunts();
  }, []);

  const loadStunts = async () => {
    try {
      const data = await supabaseGetStunts();
      setStunts(data.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        difficulty: s.difficulty_tier,
        refImage: '📸',
        coachingTips: s.coaching_cues || '',
        attempts: 0,
        masteryRate: 0,
      })));
    } catch (e) {
      console.error('Failed to load stunts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabaseDeleteStunt(id);
      setStunts(prev => prev.filter(s => s.id !== id));
      if (selectedStunt?.id === id) setSelectedStunt(null);
    } catch (e) {
      console.error('Failed to delete stunt:', e);
      setFormError('Failed to delete stunt. Please try again.');
    }
  };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStunt, setSelectedStunt] = useState<Stunt | null>(null);

  // Shared add/edit form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingStunt, setEditingStunt] = useState<Stunt | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Stunt['category']>('stunt');
  const [formDifficulty, setFormDifficulty] = useState<Stunt['difficulty']>('beginner');
  const [formTips, setFormTips] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddForm = () => {
    setEditingStunt(null);
    setFormName('');
    setFormCategory('stunt');
    setFormDifficulty('beginner');
    setFormTips('');
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (stunt: Stunt) => {
    setEditingStunt(stunt);
    setFormName(stunt.name);
    setFormCategory(stunt.category);
    setFormDifficulty(stunt.difficulty);
    setFormTips(stunt.coachingTips || '');
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveStunt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Stunt name is required.');
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        difficulty_tier: formDifficulty,
        coaching_cues: formTips.trim(),
      };
      if (editingStunt) {
        await supabaseUpdateStunt(editingStunt.id, payload);
        setStunts(prev => prev.map(s => (s.id === editingStunt.id ? { ...s, ...payload, coachingTips: formTips.trim() } : s)));
        if (selectedStunt?.id === editingStunt.id) setSelectedStunt({ ...selectedStunt, ...payload, coachingTips: formTips.trim() });
      } else {
        const created = await supabaseCreateStunt({ ...payload, is_archived: false });
        if (created?.id) {
          setStunts(prev => [
            {
              id: created.id,
              name: created.name,
              category: created.category,
              difficulty: created.difficulty_tier,
              refImage: '📸',
              coachingTips: created.coaching_cues || '',
              attempts: 0,
              masteryRate: 0,
            },
            ...prev,
          ]);
        } else {
          await loadStunts();
        }
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save stunt.');
    } finally {
      setIsSaving(false);
    }
  };

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
      {loading && (
        <p className="text-sm text-zinc-500 py-8 text-center">Loading stunts…</p>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Stunt Syllabus</h3>
          <p className="text-sm text-zinc-400 mt-1">Create, edit, and manage all poses and stunts</p>
        </div>
        <button
          onClick={openAddForm}
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
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditForm(stunt); }}
                    className="flex-1 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete ${stunt.name}? This archives the stunt.`)) void handleDelete(stunt.id);
                    }}
                    className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
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
                        <button
                          onClick={() => openEditForm(stunt)}
                          className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${stunt.name}? This archives the stunt.`)) void handleDelete(stunt.id);
                          }}
                          className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all"
                        >
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
                <button
                  onClick={() => openEditForm(selectedStunt)}
                  className="flex-1 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold transition-all"
                >
                  Edit Stunt
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ${selectedStunt.name}? This archives the stunt.`)) void handleDelete(selectedStunt.id);
                  }}
                  className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Stunt Form */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-md overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-lg font-black text-white">{editingStunt ? 'Edit Stunt' : 'Add Stunt'}</h3>
              <button
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStunt} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Stunt Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Full Extension"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as Stunt['category'])}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="stunt">Stunt</option>
                    <option value="jump">Jump</option>
                    <option value="tumbling">Tumbling</option>
                    <option value="pom_motion">Pom Motion</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as Stunt['difficulty'])}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Coaching Tips</label>
                <textarea
                  value={formTips}
                  onChange={(e) => setFormTips(e.target.value)}
                  rows={3}
                  placeholder="Key cues athletes should follow..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>
              {formError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold disabled:opacity-60 transition-all"
              >
                {isSaving ? 'Saving...' : editingStunt ? 'Save Changes' : 'Create Stunt'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
