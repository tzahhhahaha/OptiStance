import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, Grid3X3, List, MessageSquare, X, AlertCircle, ImageIcon, Upload, Loader2, Inbox } from 'lucide-react';
import { supabaseGetStunts, supabaseDeleteStunt, supabaseCreateStunt, supabaseUpdateStunt, supabaseGetSessions } from '../../../services/supabaseApi';
import { uploadPoseImage, deletePoseImage, validatePoseImage } from '../../../services/poseImages';
import type { StuntCategory, DifficultyTier } from '../../../types/supabase';
import { rollUpByStunt } from '../../utils/adminStats';
import { MASTERY_THRESHOLD } from '../../types';

interface Stunt {
  id: string;
  name: string;
  category: StuntCategory;
  difficulty: DifficultyTier;
  refImage: string;
  /** Slug of the bundled library pose this stunt maps to, when it has one. */
  poseKey: string | null;
  coachingTips: string;
  /** Real attempt count, from practice_sessions. */
  attempts: number;
  /**
   * Share of scored attempts that reached MASTERY_THRESHOLD, or null when
   * nothing has been scored for this stunt. This used to be hardcoded to 0,
   * which rendered a confident "0%" under every stunt in the library.
   */
  masteryRate: number | null;
}

/** Slugify a stunt name so uploads land under a recognisable object path. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pose';

/**
 * Pose thumbnail: the uploaded reference image, falling back to the category
 * glyph.
 *
 * The fallback also covers a broken image URL, which matters because the poses
 * seeded at launch point at externally hosted Google URLs that can expire or
 * refuse to load. A missing picture should degrade to the glyph rather than
 * leave a broken-image icon in the console.
 */
const StuntThumb: React.FC<{
  src?: string;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
  glyphClassName?: string;
}> = ({ src, alt, fallback, className = '', glyphClassName = 'text-4xl' }) => {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={`flex items-center justify-center ${glyphClassName} ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`object-cover ${className}`}
    />
  );
};


export default function DarkAdminContent() {
  const [stunts, setStunts] = useState<Stunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Stunt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadStunts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, sessions] = await Promise.all([
        supabaseGetStunts(),
        // RLS lets admins read every session. A failure here degrades the stats
        // to "no attempts recorded" rather than blocking the syllabus.
        supabaseGetSessions().catch(() => []),
      ]);

      const rollups = new Map(
        rollUpByStunt(sessions, MASTERY_THRESHOLD).map((r) => [r.stuntId, r])
      );

      setStunts(data.map((s) => {
        const rollup = rollups.get(s.id);
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          difficulty: s.difficulty_tier,
          refImage: s.reference_image_url ?? '',
          poseKey: s.pose_key ?? null,
          coachingTips: s.coaching_cues || '',
          attempts: rollup?.attempts ?? 0,
          masteryRate: rollup?.masteryRate ?? null,
        };
      }));
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : 'Could not load the stunt syllabus. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStunts();
  }, [loadStunts]);

  const handleDelete = async (id: string) => {
    const target = stunts.find((s) => s.id === id);
    setIsDeleting(true);
    setFormError(null);
    try {
      await supabaseDeleteStunt(id);
      setStunts(prev => prev.filter(s => s.id !== id));
      if (selectedStunt?.id === id) setSelectedStunt(null);
      // The row is archived rather than removed, so the image is still
      // referenced if the stunt is ever restored. Clean it up regardless: an
      // orphaned object costs storage and nothing points at it.
      if (target?.refImage) void deletePoseImage(target.refImage);
    } catch (e) {
      console.error('Failed to delete stunt:', e);
      setFormError('Failed to delete stunt. Please try again.');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
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

  // Reference image state for the add/edit form.
  //
  // `formImageUrl` is what the row will end up pointing at. It starts as the
  // stunt's current image, is replaced by an object URL as soon as a file is
  // picked (so the admin sees their choice before anything is uploaded), and is
  // only swapped for the real public URL once the upload succeeds. `pendingFile`
  // being non-null is what marks the image as unsaved.
  const [formImageUrl, setFormImageUrl] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs are revoked when replaced or on unmount so a long editing
  // session does not leak one blob per picked file.
  const previewObjectUrl = formImageUrl.startsWith('blob:') ? formImageUrl : null;
  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  const openAddForm = () => {
    setEditingStunt(null);
    setFormName('');
    setFormCategory('stunt');
    setFormDifficulty('beginner');
    setFormTips('');
    setFormError(null);
    setFormImageUrl('');
    setPendingFile(null);
    setImageError(null);
    setFormOpen(true);
  };

  const openEditForm = (stunt: Stunt) => {
    setEditingStunt(stunt);
    setFormName(stunt.name);
    setFormCategory(stunt.category);
    setFormDifficulty(stunt.difficulty);
    setFormTips(stunt.coachingTips || '');
    setFormError(null);
    setFormImageUrl(stunt.refImage || '');
    setPendingFile(null);
    setImageError(null);
    setFormOpen(true);
  };

  /** Validate and stage a picked file as a local preview. */
  const handlePickImage = (file: File | null | undefined) => {
    if (!file) return;
    const invalid = validatePoseImage(file);
    if (invalid) {
      setImageError(invalid);
      return;
    }
    setImageError(null);
    setFormImageUrl((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
  };

  const handleRemoveImage = () => {
    setFormImageUrl((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return '';
    });
    setPendingFile(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveStunt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Stunt name is required.');
      return;
    }
    setIsSaving(true);
    setFormError(null);

    // The image is uploaded before the row is written, because the row stores
    // the resulting URL. A failed upload therefore leaves the row untouched
    // rather than pointing it at an image that does not exist.
    const previousImage = editingStunt?.refImage || '';
    let imageUrl = formImageUrl;
    try {
      if (pendingFile) {
        setIsUploading(true);
        const slug = editingStunt ? editingStunt.poseKey ?? editingStunt.id : slugify(formName);
        imageUrl = await uploadPoseImage(pendingFile, slug);
        setIsUploading(false);
      }
    } catch (err) {
      setIsUploading(false);
      setFormError(err instanceof Error ? err.message : 'Image upload failed.');
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        difficulty_tier: formDifficulty,
        coaching_cues: formTips.trim(),
        reference_image_url: imageUrl.trim() || null,
      };
      if (editingStunt) {
        await supabaseUpdateStunt(editingStunt.id, payload);
        setStunts(prev => prev.map(s => (s.id === editingStunt.id ? {
          ...s,
          ...payload,
          refImage: payload.reference_image_url ?? '',
          coachingTips: formTips.trim(),
        } : s)));
        if (selectedStunt?.id === editingStunt.id) setSelectedStunt({
          ...selectedStunt,
          ...payload,
          refImage: payload.reference_image_url ?? '',
          coachingTips: formTips.trim(),
        });
        // Only drop the old object once the row is safely pointing elsewhere.
        if (previousImage && previousImage !== payload.reference_image_url) {
          void deletePoseImage(previousImage);
        }
      } else {
        const created = await supabaseCreateStunt({ ...payload, is_archived: false });
        if (created?.id) {
          setStunts(prev => [
            {
              id: created.id,
              name: created.name,
              category: created.category,
              difficulty: created.difficulty_tier,
              refImage: created.reference_image_url ?? '',
              poseKey: created.pose_key ?? null,
              coachingTips: created.coaching_cues || '',
              // Brand new: nobody has attempted it yet, and null (not 0) is what
              // makes the UI say "no attempts" instead of "0% mastery".
              attempts: 0,
              masteryRate: null,
            },
            ...prev,
          ]);
        } else {
          await loadStunts();
        }
      }
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      setPendingFile(null);
      setFormImageUrl(imageUrl);
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

  const categoryIcons: Record<Stunt['category'], string> = {
    stunt: '🏄',
    jump: '🦘',
    tumbling: '🤸',
    pom_motion: '📍',
    // These two are valid in the database CHECK constraint and in the
    // `StuntCategory` union, but they had no entry here and none in the form's
    // category list. A Liberty stunt therefore rendered an empty thumbnail and
    // the edit form showed no selected category, so saving one silently reset
    // it. Keyed by the full union so a new category fails to compile rather
    // than quietly rendering blank.
    liberty: '🕊️',
    other: '✨',
  };

  return (
    <div className="space-y-6">
      {/* Was `console.error` only, so a failed syllabus fetch rendered as an
          empty page with no way to retry and no sign anything had gone wrong. */}
      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <p className="text-sm text-rose-200">{loadError}</p>
            <button
              onClick={() => void loadStunts()}
              className="mt-2 text-xs font-bold text-rose-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Loading stunts…</p>
      ) : stunts.length === 0 && !loadError ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            <Inbox className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="mb-1 text-sm font-bold text-white">No stunts in the syllabus yet</p>
          <p className="mx-auto max-w-sm text-xs text-zinc-500">
            Add the first pose and it becomes selectable in the athlete library
            straight away.
          </p>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Stunt Syllabus</h3>
          <p className="text-sm text-zinc-400 mt-1">
            {stunts.length} {stunts.length === 1 ? 'pose' : 'poses'} · attempts and mastery
            counted from recorded practice sessions
          </p>
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
      <div className="flex gap-2" role="group" aria-label="Layout">
        <button
          onClick={() => setViewMode('grid')}
          aria-pressed={viewMode === 'grid'}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            viewMode === 'grid'
              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
              : 'bg-white/[0.05] text-zinc-400 border border-white/[0.08]'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          Grid
        </button>
        <button
          onClick={() => setViewMode('list')}
          aria-pressed={viewMode === 'list'}
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {stunts.map((stunt) => (
            <div
              key={stunt.id}
              className="group bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-white/[0.08] hover:border-white/[0.15] transition-all overflow-hidden"
            >
              {/* The tile used to be a plain <div onClick>, which no keyboard or
                  screen-reader user could reach, and it wrapped the action
                  buttons. It is now a real button, with the actions as siblings
                  so there is no nested interactive element. */}
              <button
                type="button"
                onClick={() => setSelectedStunt(stunt)}
                className="block w-full text-left"
              >
                {/* Image */}
                <div className="w-full h-32 bg-white/[0.02] rounded-xl mb-4 flex items-center justify-center border border-white/[0.05] overflow-hidden relative">
                  <StuntThumb
                    src={stunt.refImage}
                    alt={`${stunt.name} reference`}
                    fallback={categoryIcons[stunt.category]}
                    className="w-full h-full"
                  />
                  {stunt.poseKey && (
                    <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                      In library
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold text-white truncate">{stunt.name}</h4>
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
                      <p className="text-xs text-zinc-500 font-medium">Mastery</p>
                      {stunt.masteryRate === null ? (
                        <p
                          className="text-sm font-bold text-zinc-500"
                          title={`No scored attempts. Mastery counts attempts at ${MASTERY_THRESHOLD}% or better.`}
                        >
                          —
                        </p>
                      ) : (
                        <p className="text-sm font-black text-emerald-400">
                          {stunt.masteryRate}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Actions — always visible. These were `opacity-0 group-hover:`
                  which is unreachable on a touch device, and this ships as a
                  Capacitor app where there is no hover state at all. */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openEditForm(stunt)}
                  className="flex-1 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => setPendingDelete(stunt)}
                  aria-label={`Delete ${stunt.name}`}
                  className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
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
                  <th className="px-4 py-4 w-16"></th>
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
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                        <StuntThumb
                          src={stunt.refImage}
                          alt={`${stunt.name} reference`}
                          fallback={categoryIcons[stunt.category]}
                          className="w-full h-full"
                          glyphClassName="text-xl"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedStunt(stunt)}
                        className="text-left font-bold text-white hover:text-indigo-300 transition-colors"
                      >
                        {stunt.name}
                      </button>
                      {stunt.poseKey && (
                        <span className="block mt-1 text-[9px] font-bold uppercase tracking-wider w-fit px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                          In library
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 capitalize text-sm">{stunt.category.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${difficultyColors[stunt.difficulty]}`}>
                        {stunt.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">{stunt.attempts}</td>
                    <td className="px-6 py-4">
                      {stunt.masteryRate === null ? (
                        <span
                          className="text-zinc-500 text-xs"
                          title={`No scored attempts. Mastery counts attempts at ${MASTERY_THRESHOLD}% or better.`}
                        >
                          No data
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-white/[0.1] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                              style={{ width: `${stunt.masteryRate}%` }}
                            />
                          </div>
                          <span className="text-white font-bold text-xs">{stunt.masteryRate}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {/* Always rendered. The hover-only variant meant these two
                          controls could not be reached at all on a phone. */}
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditForm(stunt)}
                          aria-label={`Edit ${stunt.name}`}
                          title="Edit"
                          className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(stunt)}
                          aria-label={`Delete ${stunt.name}`}
                          title="Delete"
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
        </>
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
              {/* Reference Image */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] aspect-video flex items-center justify-center">
                <StuntThumb
                  src={selectedStunt.refImage}
                  alt={`${selectedStunt.name} reference`}
                  fallback={categoryIcons[selectedStunt.category]}
                  className="w-full h-full"
                  glyphClassName="text-6xl"
                />
              </div>

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
                  {selectedStunt.attempts === 0 ? (
                    <p className="text-sm text-zinc-500">None recorded yet</p>
                  ) : (
                    <p className="text-3xl font-black text-white">{selectedStunt.attempts}</p>
                  )}
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Mastery Rate</p>
                  {selectedStunt.masteryRate === null ? (
                    <p className="text-sm text-zinc-500">Not scored yet</p>
                  ) : (
                    <p className="text-3xl font-black text-emerald-400">
                      {selectedStunt.masteryRate}%
                    </p>
                  )}
                </div>
              </div>

              {selectedStunt.masteryRate === null && selectedStunt.attempts > 0 && (
                <p className="-mt-3 text-xs leading-relaxed text-zinc-500">
                  {selectedStunt.attempts}{' '}
                  {selectedStunt.attempts === 1 ? 'attempt has' : 'attempts have'} been
                  recorded for this pose but {selectedStunt.attempts === 1 ? 'it was' : 'they were'}{' '}
                  not scored, so mastery is not yet defined.
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => openEditForm(selectedStunt)}
                  className="flex-1 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold transition-all"
                >
                  Edit Stunt
                </button>
                <button
                  onClick={() => setPendingDelete(selectedStunt)}
                  aria-label={`Delete ${selectedStunt.name}`}
                  className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation. Replaces window.confirm, which is blocked in
          some in-app webviews and is not themeable or translatable. */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isDeleting) setPendingDelete(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-stunt-title"
            aria-describedby="delete-stunt-body"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0d12]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <h3 id="delete-stunt-title" className="text-base font-bold text-white">
                  Archive {pendingDelete.name}?
                </h3>
              </div>
            </div>

            <p id="delete-stunt-body" className="mb-5 text-sm leading-relaxed text-zinc-400">
              The pose disappears from the athlete library immediately. Existing practice
              sessions keep their history, and the record is kept so it can be restored.
              {pendingDelete.refImage && ' Its reference image is deleted from storage.'}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => void handleDelete(pendingDelete.id)}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeleting ? 'Archiving…' : 'Archive pose'}
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] py-2.5 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
              >
                Cancel
              </button>
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
              {/* Replaces two raw <select> elements. Native selects render an
                  unstyled OS dropdown that ignores the console's dark palette,
                  and collapse to a tiny tappable target on a phone. */}
              <div className="grid grid-cols-2 gap-3">
                <SegmentedField
                  label="Category"
                  name="stunt-category"
                  value={formCategory}
                  options={[
                    { value: 'stunt', label: 'Stunt' },
                    { value: 'jump', label: 'Jump' },
                    { value: 'tumbling', label: 'Tumbling' },
                    { value: 'pom_motion', label: 'Pom' },
                    { value: 'liberty', label: 'Liberty' },
                    { value: 'other', label: 'Other' },
                  ]}
                  onChange={(v) => setFormCategory(v as Stunt['category'])}
                />
                <SegmentedField
                  label="Difficulty"
                  name="stunt-difficulty"
                  value={formDifficulty}
                  options={[
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Inter.' },
                    { value: 'advanced', label: 'Advanced' },
                  ]}
                  onChange={(v) => setFormDifficulty(v as Stunt['difficulty'])}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Reference Image</label>

                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                  <div className="aspect-video flex items-center justify-center">
                    <StuntThumb
                      src={formImageUrl}
                      alt="Selected reference image"
                      fallback={<ImageIcon className="w-8 h-8 text-zinc-600" />}
                      className="w-full h-full"
                      glyphClassName="text-zinc-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2 border-t border-white/[0.06] bg-black/20">
                    <label className="flex-1 cursor-pointer">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => handlePickImage(e.target.files?.[0])}
                      />
                      <span className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        {formImageUrl ? 'Replace image' : 'Choose image'}
                      </span>
                    </label>

                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-600 mt-1.5">
                  JPG, PNG, WebP or GIF, up to 5&nbsp;MB.
                  {editingStunt?.poseKey
                    ? ' This pose appears in the athlete library, so this is the picture they will see.'
                    : ' This stunt is not in the athlete library, so the image is kept for reference only.'}
                </p>

                {imageError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {imageError}
                  </p>
                )}
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
                disabled={isSaving || isUploading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {isUploading || isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isUploading ? 'Uploading image…' : 'Saving…'}
                  </>
                ) : editingStunt ? (
                  'Save Changes'
                ) : (
                  'Create Stunt'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Small single-choice control built from real radio inputs.
 *
 * Kept local rather than promoted to `components/ui/` because that folder is
 * currently 43 unused shadcn/Radix files; adding to it would only hide a
 * dependency the project is not using.
 */
function SegmentedField({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-bold text-zinc-500">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] p-1.5"
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex-1 cursor-pointer rounded-lg px-2 py-2 text-center text-[11px] font-bold transition-colors ${
                isSelected
                  ? 'bg-indigo-500/30 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
