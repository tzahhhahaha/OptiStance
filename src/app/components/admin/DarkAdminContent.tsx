import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, Grid3X3, List, MessageSquare, X, AlertCircle, ImageIcon, Upload, Loader2, Inbox, Search, Archive, RotateCcw, CheckCircle2, Lock, Unlock, Sparkles, Activity, Layers, Wand2, Crosshair, Copy, Check, Film } from 'lucide-react';
import {
  supabaseGetStunts,
  supabaseCreateStunt,
  supabaseUpdateStunt,
  supabaseGetSessions,
  supabaseGetArchivedStunts,
  supabaseArchiveStunt,
  supabaseRestoreStunt,
  supabasePermanentlyDeleteStunt,
  supabaseToggleStuntLock,
} from '../../../services/supabaseApi';
import { uploadPoseImage, deletePoseImage, validatePoseImage } from '../../../services/poseImages';
import type { StuntCategory, DifficultyTier } from '../../../types/supabase';
import { rollUpByStunt } from '../../utils/adminStats';
import { MASTERY_THRESHOLD } from '../../types';
import { INITIAL_POSES } from '../../data/poses';
import { getBundledPoseImage, isLegacyGoogleUrl } from '../../utils/poseReferenceImages';
import { extractPoseBlueprint, type PoseBlueprintResult } from '../../utils/poseBlueprint';
import { PoseVideoInput } from './PoseVideoInput';

interface Stunt {
  id: string;
  name: string;
  category: StuntCategory;
  difficulty: DifficultyTier;
  refImage: string;
  refVideo?: string | null;
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
  /** Whether the stunt is temporarily locked/unavailable to athletes */
  isLocked: boolean;
}

/** Slugify a stunt name so uploads land under a recognisable object path. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pose';

/**
 * Pose thumbnail: the uploaded reference image, falling back to the bundled local
 * asset (/poses/<id>.jpg), and finally falling back to the category glyph.
 *
 * The fallback also covers a broken image URL, which matters because the poses
 * seeded at launch point at externally hosted Google URLs that can expire or
 * refuse to load. A missing picture degrades cleanly rather than showing a broken icon.
 */
const resolveThumbSrc = (src?: string, fallbackSrc?: string): string => {
  if (!src) return fallbackSrc || '';
  if (isLegacyGoogleUrl(src)) return fallbackSrc || '';
  return src;
};

const StuntThumb: React.FC<{
  src?: string;
  fallbackSrc?: string;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
  glyphClassName?: string;
}> = ({ src, fallbackSrc, alt, fallback, className = '', glyphClassName = 'text-4xl' }) => {
  const initial = resolveThumbSrc(src, fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState(initial);
  const [triedFallback, setTriedFallback] = useState(false);
  const [failed, setFailed] = useState(!initial);

  useEffect(() => {
    const s = resolveThumbSrc(src, fallbackSrc);
    setCurrentSrc(s);
    setTriedFallback(false);
    setFailed(!s);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!triedFallback && fallbackSrc && currentSrc !== fallbackSrc) {
      setTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setFailed(true);
    }
  };

  if (failed || !currentSrc) {
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
      src={currentSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
      className={`object-cover ${className}`}
    />
  );
};


export default function DarkAdminContent() {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [stunts, setStunts] = useState<Stunt[]>([]);
  const [archivedStunts, setArchivedStunts] = useState<Stunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<Stunt | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<Stunt | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);

  const loadStunts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [activeData, archivedData, sessions] = await Promise.all([
        supabaseGetStunts(),
        supabaseGetArchivedStunts().catch(() => []),
        // RLS lets admins read every session. A failure here degrades the stats
        // to "no attempts recorded" rather than blocking the syllabus.
        supabaseGetSessions().catch(() => []),
      ]);

      const rollups = new Map(
        rollUpByStunt(sessions, MASTERY_THRESHOLD).map((r) => [r.stuntId, r])
      );

      const lockedFromStorage = (() => {
        try {
          const raw = localStorage.getItem('optistance_locked_stunts');
          return new Set<string>(raw ? JSON.parse(raw) : []);
        } catch {
          return new Set<string>();
        }
      })();

      const mapRows = (rows: typeof activeData): Stunt[] =>
        rows.map((s) => {
          const rollup = rollups.get(s.id);
          const bundledFallback = getBundledPoseImage(s.pose_key, s.name);
          const rawUrl = s.reference_image_url?.trim() || '';
          const effectiveRefImage =
            rawUrl && !isLegacyGoogleUrl(rawUrl)
              ? rawUrl
              : bundledFallback || rawUrl;

          const isLocked =
            Boolean(s.is_locked) ||
            lockedFromStorage.has(s.id) ||
            (s.pose_key ? lockedFromStorage.has(s.pose_key) : false) ||
            lockedFromStorage.has(s.name.toLowerCase().trim());

          return {
            id: s.id,
            name: s.name,
            category: s.category,
            difficulty: s.difficulty_tier,
            refImage: effectiveRefImage,
            refVideo: s.reference_video_url || null,
            poseKey: s.pose_key ?? null,
            coachingTips: s.coaching_cues || '',
            attempts: rollup?.attempts ?? 0,
            masteryRate: rollup?.masteryRate ?? null,
            isLocked,
          };
        });

      setStunts(mapRows(activeData));
      setArchivedStunts(mapRows(archivedData));
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : 'Could not load the pose library. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStunts();
  }, [loadStunts]);

  const handleArchive = async (id: string) => {
    const target = stunts.find((s) => s.id === id);
    if (!target) return;
    setIsArchiving(true);
    setFormError(null);
    try {
      await supabaseArchiveStunt(id);
      setStunts((prev) => prev.filter((s) => s.id !== id));
      setArchivedStunts((prev) => [target, ...prev]);
      if (selectedStunt?.id === id) setSelectedStunt(null);
      window.dispatchEvent(
        new CustomEvent('optistance:stunt-archive', {
          detail: { stuntId: id, stuntName: target.name, poseKey: target.poseKey },
        })
      );
      setActionMessage(`"${target.name}" moved to Archive.`);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e) {
      console.error('Failed to archive stunt:', e);
      setFormError('Failed to archive stunt. Please try again.');
    } finally {
      setIsArchiving(false);
      setPendingArchive(null);
    }
  };

  const handleRestore = async (id: string) => {
    const target = archivedStunts.find((s) => s.id === id);
    if (!target) return;
    setRestoringId(id);
    setFormError(null);
    try {
      await supabaseRestoreStunt(id);
      setArchivedStunts((prev) => prev.filter((s) => s.id !== id));
      setStunts((prev) => [target, ...prev]);
      if (selectedStunt?.id === id) setSelectedStunt(null);
      window.dispatchEvent(
        new CustomEvent('optistance:stunt-restore', {
          detail: { stuntId: id, stuntName: target.name, poseKey: target.poseKey },
        })
      );
      setActionMessage(`"${target.name}" restored to Active Library.`);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e) {
      console.error('Failed to restore stunt:', e);
      setFormError('Failed to restore stunt. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const target = archivedStunts.find((s) => s.id === id);
    setIsPermanentlyDeleting(true);
    setFormError(null);
    try {
      await supabasePermanentlyDeleteStunt(id);
      setArchivedStunts((prev) => prev.filter((s) => s.id !== id));
      if (selectedStunt?.id === id) setSelectedStunt(null);
      if (target?.refImage) void deletePoseImage(target.refImage);
      setActionMessage(`"${target?.name ?? 'Stunt'}" permanently deleted.`);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e) {
      console.error('Failed to delete stunt permanently:', e);
      setFormError('Failed to delete stunt permanently. Please try again.');
    } finally {
      setIsPermanentlyDeleting(false);
      setPendingPermanentDelete(null);
    }
  };

  const [isTogglingLock, setIsTogglingLock] = useState<string | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'unlocked' | 'locked'>('all');

  const handleToggleLock = async (stunt: Stunt) => {
    const nextLocked = !stunt.isLocked;
    setIsTogglingLock(stunt.id);
    setFormError(null);

    try {
      await supabaseToggleStuntLock(stunt.id, nextLocked);
      setStunts((prev) =>
        prev.map((s) => (s.id === stunt.id ? { ...s, isLocked: nextLocked } : s))
      );
      if (selectedStunt?.id === stunt.id) {
        setSelectedStunt((prev) => (prev ? { ...prev, isLocked: nextLocked } : null));
      }
      window.dispatchEvent(
        new CustomEvent('optistance:stunt-lock', {
          detail: { stuntId: stunt.id, stuntName: stunt.name, poseKey: stunt.poseKey, isLocked: nextLocked },
        })
      );
      setActionMessage(
        nextLocked
          ? `"${stunt.name}" is now locked (temporarily unavailable to athletes).`
          : `"${stunt.name}" is now unlocked (available to athletes).`
      );
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e) {
      console.error('Failed to save stunt availability:', e);
      setFormError(
        e instanceof Error
          ? `Could not update "${stunt.name}": ${e.message}`
          : `Could not update "${stunt.name}". Check the network and admin permissions, then retry.`
      );
    } finally {
      setIsTogglingLock(null);
    }
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStunt, setSelectedStunt] = useState<Stunt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const currentStunts = activeTab === 'active' ? stunts : archivedStunts;
  const normalize = (text: string) => text.toLowerCase().replace(/[-_\s]+/g, ' ');

  const filteredStunts = currentStunts.filter((stunt) => {
    const trimmed = searchQuery.trim().toLowerCase();
    const normalizedQ = normalize(trimmed);

    const matchesSearch =
      !trimmed ||
      stunt.name.toLowerCase().includes(trimmed) ||
      normalize(stunt.name).includes(normalizedQ) ||
      stunt.coachingTips.toLowerCase().includes(trimmed) ||
      stunt.category.toLowerCase().includes(trimmed) ||
      stunt.difficulty.toLowerCase().includes(trimmed);

    const matchesCategory = selectedCategory === 'all' || stunt.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || stunt.difficulty === selectedDifficulty;
    const matchesAvailability =
      activeTab !== 'active' ||
      selectedAvailability === 'all' ||
      (selectedAvailability === 'locked' && stunt.isLocked) ||
      (selectedAvailability === 'unlocked' && !stunt.isLocked);

    return matchesSearch && matchesCategory && matchesDifficulty && matchesAvailability;
  });

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

  // Reference / Demo Video URL state
  const [formVideoUrl, setFormVideoUrl] = useState('');

  // AI Kinematic Blueprint state
  const [blueprintResult, setBlueprintResult] = useState<PoseBlueprintResult | null>(null);
  const [isExtractingBlueprint, setIsExtractingBlueprint] = useState(false);
  const [showBlueprintView, setShowBlueprintView] = useState(false);
  const [showCoordinateTags, setShowCoordinateTags] = useState(false);
  const [telemetryTab, setTelemetryTab] = useState<'angles' | 'coords'>('angles');
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Object URLs are revoked when replaced or on unmount so a long editing
  // session does not leak one blob per picked file.
  const previewObjectUrl = formImageUrl.startsWith('blob:') ? formImageUrl : null;
  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  /** Analyze pose image to extract 3D skeleton blueprint and joint coordinates */
  const triggerBlueprintAnalysis = async (source: File | string) => {
    setIsExtractingBlueprint(true);
    try {
      const result = await extractPoseBlueprint(source);
      setBlueprintResult(result);
      if (result.hasPose && result.blueprintDataUrl) {
        setShowBlueprintView(true);
      }
    } catch (err) {
      console.warn('[DarkAdminContent] Failed to extract blueprint:', err);
    } finally {
      setIsExtractingBlueprint(false);
    }
  };

  const openAddForm = () => {
    setEditingStunt(null);
    setFormName('');
    setFormCategory('stunt');
    setFormDifficulty('beginner');
    setFormTips('');
    setFormError(null);
    setFormImageUrl('');
    setFormVideoUrl('');
    setPendingFile(null);
    setImageError(null);
    setBlueprintResult(null);
    setIsExtractingBlueprint(false);
    setShowBlueprintView(false);
    setShowCoordinateTags(false);
    setTelemetryTab('angles');
    setCopiedCoords(false);
    setFormOpen(true);
  };

  const openEditForm = (stunt: Stunt) => {
    setEditingStunt(stunt);
    setFormName(stunt.name);
    setFormCategory(stunt.category);
    setFormDifficulty(stunt.difficulty);
    setFormTips(stunt.coachingTips || '');
    setFormError(null);
    setFormImageUrl(stunt.refImage || getBundledPoseImage(stunt.poseKey, stunt.name) || '');
    setFormVideoUrl(stunt.refVideo || '');
    setPendingFile(null);
    setImageError(null);
    setBlueprintResult(null);
    setIsExtractingBlueprint(false);
    setShowBlueprintView(false);
    setShowCoordinateTags(false);
    setTelemetryTab('angles');
    setCopiedCoords(false);
    setFormOpen(true);
  };

  /** Validate, stage a picked file as a local preview, and run blueprint extraction. */
  const handlePickImage = (file: File | null | undefined) => {
    if (!file) return;
    const invalid = validatePoseImage(file);
    if (invalid) {
      setImageError(invalid);
      return;
    }
    setImageError(null);
    setBlueprintResult(null);
    setShowBlueprintView(false);
    setFormImageUrl((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
    void triggerBlueprintAnalysis(file);
  };

  const handleRemoveImage = () => {
    setFormImageUrl((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return '';
    });
    setPendingFile(null);
    setImageError(null);
    setBlueprintResult(null);
    setShowBlueprintView(false);
    setShowCoordinateTags(false);
    setIsExtractingBlueprint(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScanExistingBlueprint = () => {
    const src = pendingFile || formImageUrl || (editingStunt ? getBundledPoseImage(editingStunt.poseKey, editingStunt.name) : '');
    if (!src) return;
    void triggerBlueprintAnalysis(src);
  };

  const handleApplyBlueprintTips = () => {
    if (!blueprintResult?.coachingCueSuggestion) return;
    const suggestion = blueprintResult.coachingCueSuggestion;
    setFormTips((current) => {
      if (!current.trim()) return suggestion;
      if (current.includes(suggestion)) return current;
      return `${current.trim()}\n• ${suggestion}`;
    });
  };

  const handleCopyCoordinates = () => {
    if (!blueprintResult?.keyCoordinates) return;
    const payload = {
      pose: formName.trim() || blueprintResult.detectedPoseName,
      confidence: blueprintResult.confidence,
      angles: blueprintResult.angles,
      coordinates: blueprintResult.keyCoordinates,
    };
    void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleAppendCoordinatesToTips = () => {
    if (!blueprintResult?.keyCoordinates || blueprintResult.keyCoordinates.length === 0) return;
    const lines = [
      `Target Coordinates:`,
      ...blueprintResult.keyCoordinates
        .filter((c) => ['L.Shoulder', 'R.Shoulder', 'L.Elbow', 'R.Elbow', 'L.Wrist', 'R.Wrist', 'L.Knee', 'R.Knee'].includes(c.name))
        .map((c) => `• ${c.name}: (${c.x}, ${c.y})`),
    ];
    const textToAppend = lines.join('\n');
    setFormTips((current) => {
      if (!current.trim()) return textToAppend;
      if (current.includes('Target Coordinates:')) return current;
      return `${current.trim()}\n\n${textToAppend}`;
    });
  };

  const handleSaveStunt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter a pose / stunt name.');
      return;
    }
    if (!formImageUrl && !pendingFile) {
      setFormError('A reference stance image is required so athletes have a visual model.');
      return;
    }
    if (!formTips.trim()) {
      setFormError('Please provide coaching tips / key cues for athletes.');
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
        reference_video_url: formVideoUrl.trim() || null,
      };
      if (editingStunt) {
        await supabaseUpdateStunt(editingStunt.id, payload);
        const resolvedImage = payload.reference_image_url || getBundledPoseImage(editingStunt.poseKey, payload.name) || '';
        setStunts(prev => prev.map(s => (s.id === editingStunt.id ? {
          ...s,
          ...payload,
          refImage: resolvedImage,
          refVideo: payload.reference_video_url,
          coachingTips: formTips.trim(),
        } : s)));
        if (selectedStunt?.id === editingStunt.id) setSelectedStunt({
          ...selectedStunt,
          ...payload,
          refImage: resolvedImage,
          refVideo: payload.reference_video_url,
          coachingTips: formTips.trim(),
        });
        // Only drop the old object once the row is safely pointing elsewhere.
        if (previousImage && previousImage !== payload.reference_image_url) {
          void deletePoseImage(previousImage);
        }
      } else {
        const created = await supabaseCreateStunt({ ...payload, is_archived: false });
        if (created?.id) {
          const resolvedCreatedImage = created.reference_image_url || getBundledPoseImage(created.pose_key, created.name) || '';
          setStunts(prev => [
            {
              id: created.id,
              name: created.name,
              category: created.category,
              difficulty: created.difficulty_tier,
              refImage: resolvedCreatedImage,
              refVideo: created.reference_video_url || payload.reference_video_url,
              poseKey: created.pose_key ?? null,
              coachingTips: created.coaching_cues || '',
              // Brand new: nobody has attempted it yet, and null (not 0) is what
              // makes the UI say "no attempts" instead of "0% mastery".
              attempts: 0,
              masteryRate: null,
              isLocked: Boolean(created.is_locked),
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
      setFormVideoUrl('');
      setFormOpen(false);
      setSuccessToast(editingStunt ? `"${formName.trim()}" updated successfully!` : `"${formName.trim()}" added to library!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save stunt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncLibraryPoses = async () => {
    setIsSyncingLibrary(true);
    setLoadError(null);
    try {
      const mapCat = (c: string): StuntCategory => {
        const cat = c.toLowerCase();
        if (cat.includes('pom')) return 'pom_motion';
        if (cat.includes('jump')) return 'jump';
        if (cat.includes('tumb')) return 'tumbling';
        if (cat.includes('liberty')) return 'liberty';
        return 'stunt';
      };

      for (const pose of INITIAL_POSES) {
        await supabaseCreateStunt({
          name: pose.name,
          category: mapCat(pose.category),
          difficulty_tier: pose.difficulty.toLowerCase() as DifficultyTier,
          pose_key: pose.id,
          reference_image_url: pose.imageUrl,
          coaching_cues: pose.description,
          is_archived: false,
          is_locked: false,
        });
      }
      await loadStunts();
    } catch (e) {
      console.error('Failed to sync library poses:', e);
      setLoadError('Failed to sync library poses. You can add stunts manually.');
    } finally {
      setIsSyncingLibrary(false);
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
    <div className="space-y-6 relative">
      {successToast && (
        <div role="status" className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/90 text-white shadow-2xl backdrop-blur-md text-xs font-bold animate-fade-in border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
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
      ) : stunts.length === 0 && archivedStunts.length === 0 && !loadError ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            <Inbox className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="mb-1 text-sm font-bold text-white">No poses in the library yet</p>
          <p className="mx-auto max-w-sm text-xs text-zinc-500 mb-5">
            Add your first custom pose or sync all {INITIAL_POSES.length} standard library poses with generated images directly into the library.
          </p>
          <button
            onClick={() => void handleSyncLibraryPoses()}
            disabled={isSyncingLibrary}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isSyncingLibrary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Sync All {INITIAL_POSES.length} Library Poses to Database
          </button>
        </div>
      ) : (
        <>
      {/* Header with Active / Archive Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {activeTab === 'active' ? 'Pose Library' : 'Archived Poses'}
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            {activeTab === 'active'
              ? `${stunts.length} active ${stunts.length === 1 ? 'pose' : 'poses'} in library · visible to athletes`
              : `${archivedStunts.length} archived ${archivedStunts.length === 1 ? 'pose' : 'poses'} · hidden from athletes`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active vs Archive Tab Switcher */}
          <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.08]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Active</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'}`}>
                {stunts.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'archive'}
              onClick={() => setActiveTab('archive')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
              {archivedStunts.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'archive' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300'}`}>
                  {archivedStunts.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'active' && (
            <button
              onClick={openAddForm}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Library</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search poses by name, cues, category..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-xs text-white placeholder:text-zinc-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-md hover:bg-white/10"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-zinc-300 focus:outline-none focus:border-indigo-500/60"
            aria-label="Filter by category"
          >
            <option value="all" className="bg-[#0f0f13] text-white">All Categories</option>
            <option value="pom_motion" className="bg-[#0f0f13] text-white">Pom Motion</option>
            <option value="stunt" className="bg-[#0f0f13] text-white">Stunt</option>
            <option value="jump" className="bg-[#0f0f13] text-white">Jump</option>
            <option value="tumbling" className="bg-[#0f0f13] text-white">Tumbling</option>
            <option value="liberty" className="bg-[#0f0f13] text-white">Liberty</option>
            <option value="other" className="bg-[#0f0f13] text-white">Other</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-zinc-300 focus:outline-none focus:border-indigo-500/60"
            aria-label="Filter by difficulty"
          >
            <option value="all" className="bg-[#0f0f13] text-white">All Levels</option>
            <option value="beginner" className="bg-[#0f0f13] text-white">Beginner</option>
            <option value="intermediate" className="bg-[#0f0f13] text-white">Intermediate</option>
            <option value="advanced" className="bg-[#0f0f13] text-white">Advanced</option>
          </select>

          {activeTab === 'active' && (
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value as 'all' | 'unlocked' | 'locked')}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-zinc-300 focus:outline-none focus:border-indigo-500/60"
              aria-label="Filter by availability"
            >
              <option value="all" className="bg-[#0f0f13] text-white">All Availability</option>
              <option value="unlocked" className="bg-[#0f0f13] text-white">Available</option>
              <option value="locked" className="bg-[#0f0f13] text-white">Locked</option>
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex gap-1 border border-white/[0.08] rounded-xl p-1 bg-white/[0.02]" role="group" aria-label="Layout">
            <button
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'archive' && archivedStunts.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            <Archive className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mb-1 text-sm font-bold text-white">Archive is empty</p>
          <p className="mx-auto max-w-sm text-xs text-zinc-500">
            Poses removed from the active syllabus will appear here. You can restore them anytime or delete them permanently.
          </p>
        </div>
      )}

      {filteredStunts.length === 0 && currentStunts.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-sm font-bold text-white mb-1">No stunts found</p>
          <p className="text-xs text-zinc-500 mb-4">
            {searchQuery ? `No poses match "${searchQuery}" with the current filters.` : 'No poses match the selected filters.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedDifficulty('all');
              setSelectedAvailability('all');
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-zinc-300 font-semibold"
          >
            Clear Search & Filters
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredStunts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {filteredStunts.map((stunt) => (
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
                    fallbackSrc={getBundledPoseImage(stunt.poseKey, stunt.name)}
                    alt={`${stunt.name} reference`}
                    fallback={categoryIcons[stunt.category]}
                    className="w-full h-full"
                  />
                  {stunt.poseKey && (
                    <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                      In library
                    </span>
                  )}
                  {activeTab === 'archive' ? (
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
                      Archived
                    </span>
                  ) : stunt.isLocked ? (
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-black border border-amber-300 shadow flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Locked
                    </span>
                  ) : null}
                  {stunt.refVideo && (
                    <span className="absolute bottom-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Film className="w-2.5 h-2.5" /> Video
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

              {/* Actions — always visible */}
              <div className="flex gap-2 pt-2">
                {activeTab === 'active' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditForm(stunt)}
                      className="flex-1 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleLock(stunt)}
                      disabled={isTogglingLock === stunt.id}
                      aria-label={stunt.isLocked ? `Unlock ${stunt.name}` : `Lock ${stunt.name}`}
                      title={stunt.isLocked ? 'Currently locked (unavailable to athletes). Click to unlock.' : 'Currently unlocked. Click to lock and make unavailable.'}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        stunt.isLocked
                          ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-400/40'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isTogglingLock === stunt.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : stunt.isLocked ? (
                        <>
                          <Unlock className="w-3 h-3 text-amber-300" />
                          <span>Unlock</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-emerald-400" />
                          <span>Lock</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingArchive(stunt)}
                      aria-label={`Archive ${stunt.name}`}
                      className="flex-1 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Archive className="w-3 h-3" />
                      <span>Archive</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleRestore(stunt.id)}
                      disabled={restoringId === stunt.id}
                      aria-label={`Restore ${stunt.name}`}
                      className="flex-1 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {restoringId === stunt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      <span>{restoringId === stunt.id ? 'Restoring…' : 'Restore'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingPermanentDelete(stunt)}
                      aria-label={`Permanently delete ${stunt.name}`}
                      className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredStunts.length > 0 && (
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
                {filteredStunts.map((stunt) => (
                  <tr key={stunt.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                        <StuntThumb
                          src={stunt.refImage}
                          fallbackSrc={getBundledPoseImage(stunt.poseKey, stunt.name)}
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
                      {activeTab !== 'archive' && (
                        stunt.isLocked ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-extrabold uppercase tracking-wider w-fit px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            <Lock className="w-2.5 h-2.5" />
                            Locked
                          </span>
                        ) : null
                      )}
                      {activeTab === 'archive' && (
                        <span className="block mt-1 text-[9px] font-bold uppercase tracking-wider w-fit px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          Archived
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
                      {/* Always rendered */}
                      <div className="flex items-center justify-center gap-2">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditForm(stunt)}
                              aria-label={`Edit ${stunt.name}`}
                              title="Edit"
                              className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleLock(stunt)}
                              disabled={isTogglingLock === stunt.id}
                              aria-label={stunt.isLocked ? `Unlock ${stunt.name}` : `Lock ${stunt.name}`}
                              title={stunt.isLocked ? 'Currently locked (unavailable to athletes). Click to unlock.' : 'Currently unlocked. Click to lock and make unavailable.'}
                              className={`p-2 rounded-lg transition-all ${
                                stunt.isLocked
                                  ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-400/40'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isTogglingLock === stunt.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : stunt.isLocked ? (
                                <Unlock className="w-4 h-4 text-amber-300" />
                              ) : (
                                <Lock className="w-4 h-4 text-emerald-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingArchive(stunt)}
                              aria-label={`Archive ${stunt.name}`}
                              title="Move to Archive"
                              className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleRestore(stunt.id)}
                              disabled={restoringId === stunt.id}
                              aria-label={`Restore ${stunt.name}`}
                              title="Restore to active syllabus"
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {restoringId === stunt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              <span>{restoringId === stunt.id ? 'Restoring…' : 'Restore'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingPermanentDelete(stunt)}
                              aria-label={`Permanently Delete ${stunt.name}`}
                              title="Delete permanently"
                              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto"
          onClick={() => setSelectedStunt(null)}
        >
          <div
            className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8 border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-black text-white">{selectedStunt.name}</h3>
                {activeTab !== 'archive' && (
                  selectedStunt.isLocked ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Locked (Unavailable)
                    </span>
                  ) : null
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedStunt(null)}
                className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 overscroll-contain">
              {/* Reference Image */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] aspect-video flex items-center justify-center">
                <StuntThumb
                  src={selectedStunt.refImage}
                  fallbackSrc={getBundledPoseImage(selectedStunt.poseKey, selectedStunt.name)}
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
                {activeTab === 'active' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditForm(selectedStunt)}
                      className="flex-1 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Stunt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleLock(selectedStunt)}
                      disabled={isTogglingLock === selectedStunt.id}
                      className={`flex-1 py-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-1.5 ${
                        selectedStunt.isLocked
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {isTogglingLock === selectedStunt.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : selectedStunt.isLocked ? (
                        <Unlock className="w-4 h-4 text-amber-300" />
                      ) : (
                        <Lock className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>{selectedStunt.isLocked ? 'Unlock Pose' : 'Lock Pose'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingArchive(selectedStunt);
                      }}
                      aria-label={`Archive ${selectedStunt.name}`}
                      className="flex-1 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRestore(selectedStunt.id);
                        setSelectedStunt(null);
                      }}
                      disabled={restoringId === selectedStunt.id}
                      aria-label={`Restore ${selectedStunt.name}`}
                      className="flex-1 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {restoringId === selectedStunt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      <span>{restoringId === selectedStunt.id ? 'Restoring…' : 'Restore to Syllabus'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPermanentDelete(selectedStunt);
                      }}
                      aria-label={`Permanently Delete ${selectedStunt.name}`}
                      className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Permanently</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Stunt Confirmation Modal */}
      {pendingArchive && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            if (!isArchiving) setPendingArchive(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-stunt-title"
            aria-describedby="archive-stunt-body"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0d12]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] my-auto"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <Archive className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 id="archive-stunt-title" className="text-base font-bold text-white">
                  Move {pendingArchive.name} to Archive?
                </h3>
              </div>
            </div>

            <p id="archive-stunt-body" className="mb-5 text-sm leading-relaxed text-zinc-400">
              The pose disappears from athlete practice and the AI camera immediately. Existing practice sessions keep their history, and the pose record remains stored so you can restore it anytime or delete it permanently from the Archive tab.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleArchive(pendingArchive.id)}
                disabled={isArchiving}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                <span>{isArchiving ? 'Archiving…' : 'Move to Archive'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingArchive(null)}
                disabled={isArchiving}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] py-2.5 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {pendingPermanentDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            if (!isPermanentlyDeleting) setPendingPermanentDelete(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="perm-delete-title"
            aria-describedby="perm-delete-body"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#12080a]/95 p-6 shadow-[0_0_60px_rgba(244,63,94,0.3)] my-auto"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <h3 id="perm-delete-title" className="text-base font-bold text-white">
                  Permanently Delete {pendingPermanentDelete.name}?
                </h3>
              </div>
            </div>

            <p id="perm-delete-body" className="mb-5 text-sm leading-relaxed text-rose-200/90">
              ⚠️ This action cannot be undone. This stunt and its reference image will be completely erased from the database and storage.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handlePermanentDelete(pendingPermanentDelete.id)}
                disabled={isPermanentlyDeleting}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(225,29,72,0.4)]"
              >
                {isPermanentlyDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isPermanentlyDeleting ? 'Deleting…' : 'Delete Permanently'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingPermanentDelete(null)}
                disabled={isPermanentlyDeleting}
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
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto"
          onClick={() => {
            if (!isSaving && !isUploading) setFormOpen(false);
          }}
        >
          <div
            className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-lg max-h-[92vh] flex flex-col my-auto overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0d0d12]/80">
              <h3 className="text-lg font-black text-white">{editingStunt ? 'Edit Stunt / Pose' : 'Add to Library'}</h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStunt} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Requirements Checklist Header */}
              <div className="px-5 sm:px-6 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">Required Checklist:</span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className={`flex items-center gap-1 font-medium ${formName.trim() ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Name
                  </span>
                  <span className={`flex items-center gap-1 font-medium ${(formImageUrl || pendingFile) ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Photo
                  </span>
                  <span className={`flex items-center gap-1 font-medium ${formTips.trim() ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Coaching Tips
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="text-xs text-zinc-500 font-bold mb-1.5 block">Pose / Stunt Name</label>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-zinc-500 font-bold block">Reference Image & AI Blueprint</label>
                  {blueprintResult?.blueprintDataUrl && (
                    <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Blueprint Ready
                    </span>
                  )}
                </div>

                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                  {/* Blueprint / Photo Toggle Bar (shown when blueprint is available) */}
                  {blueprintResult?.blueprintDataUrl && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-white/[0.08]">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Display Mode</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {showBlueprintView && (
                          <button
                            type="button"
                            onClick={() => setShowCoordinateTags((prev) => !prev)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border ${
                              showCoordinateTags
                                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-sm'
                                : 'bg-black/30 text-zinc-400 border-white/[0.06] hover:text-zinc-200'
                            }`}
                            title="Toggle coordinate labels on key joints"
                          >
                            <Crosshair className="w-3 h-3" />
                            {showCoordinateTags ? 'Coords ON' : 'Coords OFF'}
                          </button>
                        )}
                        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => setShowBlueprintView(true)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                              showBlueprintView
                                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <Layers className="w-3 h-3" /> Blueprint
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBlueprintView(false)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                              !showBlueprintView
                                ? 'bg-white/10 text-white'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <ImageIcon className="w-3 h-3" /> Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="aspect-video relative flex items-center justify-center bg-black/40">
                    {/* Extracting Spinner Overlay */}
                    {isExtractingBlueprint && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
                        <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                        <p className="text-xs font-bold text-cyan-300">Extracting AI Pose Blueprint…</p>
                        <p className="text-[10px] text-zinc-400">Detecting 33 keypoints & joint coordinates</p>
                      </div>
                    )}

                    {/* Image / Blueprint View */}
                    {showBlueprintView && blueprintResult?.blueprintDataUrl ? (
                      <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-black/60">
                        <img
                          src={
                            showCoordinateTags && blueprintResult.blueprintWithCoordsDataUrl
                              ? blueprintResult.blueprintWithCoordsDataUrl
                              : blueprintResult.blueprintDataUrl
                          }
                          alt="AI Pose Blueprint Skeleton"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-cyan-950/85 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 tracking-wider shadow-lg flex items-center gap-1">
                          {showCoordinateTags ? (
                            <>
                              <Crosshair className="w-2.5 h-2.5" />
                              <span>COORDS HUD</span>
                            </>
                          ) : (
                            <span>AI WIREFRAME</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <StuntThumb
                        src={formImageUrl}
                        fallbackSrc={editingStunt ? getBundledPoseImage(editingStunt.poseKey, editingStunt.name) : undefined}
                        alt="Selected reference image"
                        fallback={<ImageIcon className="w-8 h-8 text-zinc-600" />}
                        className="w-full h-full"
                        glyphClassName="text-zinc-600"
                      />
                    )}
                  </div>

                  {/* Actions Bar */}
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

                    {(formImageUrl || editingStunt?.refImage) && (
                      <button
                        type="button"
                        onClick={handleScanExistingBlueprint}
                        disabled={isExtractingBlueprint}
                        className="px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        title="Re-run AI skeleton detection on this image"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {blueprintResult ? 'Re-scan' : 'Scan Blueprint'}
                      </button>
                    )}

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

                {/* Blueprint Telemetry Card */}
                {blueprintResult && (
                  <div className="mt-2 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Pose: {blueprintResult.detectedPoseName}</span>
                        {blueprintResult.confidence > 0 && (
                          <span className="text-[10px] text-zinc-400">({Math.round(blueprintResult.confidence * 100)}% match)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setTelemetryTab('angles')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            telemetryTab === 'angles' ? 'bg-cyan-500/25 text-cyan-300' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Joint Angles
                        </button>
                        <button
                          type="button"
                          onClick={() => setTelemetryTab('coords')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                            telemetryTab === 'coords' ? 'bg-cyan-500/25 text-cyan-300' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <Crosshair className="w-3 h-3" />
                          Coordinates ({blueprintResult.keyCoordinates?.length || 0})
                        </button>
                      </div>
                    </div>

                    {blueprintResult.hasPose ? (
                      telemetryTab === 'angles' ? (
                        <>
                          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                            {blueprintResult.angles.leftElbow !== undefined && (
                              <div className="p-1.5 rounded-lg bg-black/40 border border-white/[0.04]">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">L. Elbow</span>
                                <span className="font-mono text-cyan-300 font-bold">{blueprintResult.angles.leftElbow}°</span>
                              </div>
                            )}
                            {blueprintResult.angles.rightElbow !== undefined && (
                              <div className="p-1.5 rounded-lg bg-black/40 border border-white/[0.04]">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">R. Elbow</span>
                                <span className="font-mono text-cyan-300 font-bold">{blueprintResult.angles.rightElbow}°</span>
                              </div>
                            )}
                            {blueprintResult.angles.leftShoulder !== undefined && (
                              <div className="p-1.5 rounded-lg bg-black/40 border border-white/[0.04]">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">L. Shoulder</span>
                                <span className="font-mono text-cyan-300 font-bold">{blueprintResult.angles.leftShoulder}°</span>
                              </div>
                            )}
                            {blueprintResult.angles.rightShoulder !== undefined && (
                              <div className="p-1.5 rounded-lg bg-black/40 border border-white/[0.04]">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">R. Shoulder</span>
                                <span className="font-mono text-cyan-300 font-bold">{blueprintResult.angles.rightShoulder}°</span>
                              </div>
                            )}
                            {blueprintResult.angles.leftKnee !== undefined && (
                              <div className="p-1.5 rounded-lg bg-black/40 border border-white/[0.04]">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">L. Knee</span>
                                <span className="font-mono text-cyan-300 font-bold">{blueprintResult.angles.leftKnee}°</span>
                              </div>
                            )}
                            {blueprintResult.angles.rightKnee !== undefined && (
                              <div className="p-1.5 rounded-lg bg-black/40 border border-white/[0.04]">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">R. Knee</span>
                                <span className="font-mono text-cyan-300 font-bold">{blueprintResult.angles.rightKnee}°</span>
                              </div>
                            )}
                          </div>
                          {blueprintResult.coachingCueSuggestion && (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleApplyBlueprintTips}
                                className="text-[11px] px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium flex items-center gap-1 transition-all"
                              >
                                <Wand2 className="w-3 h-3" /> Auto-Fill Angles into Tips
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div className="max-h-40 overflow-y-auto rounded-lg bg-black/40 border border-white/[0.04] p-1.5 text-[11px] space-y-1">
                            <div className="grid grid-cols-4 text-[9px] uppercase tracking-wider text-zinc-500 px-1.5 pb-1 border-b border-white/[0.04]">
                              <span>Joint</span>
                              <span className="text-right">X</span>
                              <span className="text-right">Y</span>
                              <span className="text-right">Depth Z</span>
                            </div>
                            {blueprintResult.keyCoordinates?.map((coord) => (
                              <div
                                key={coord.id}
                                className="grid grid-cols-4 font-mono px-1.5 py-0.5 rounded hover:bg-white/[0.03] transition-colors"
                              >
                                <span className="font-sans text-zinc-300 font-medium">{coord.name}</span>
                                <span className="text-right text-cyan-300">{coord.x.toFixed(3)}</span>
                                <span className="text-right text-cyan-300">{coord.y.toFixed(3)}</span>
                                <span className="text-right text-zinc-400">{coord.z !== undefined ? coord.z.toFixed(3) : '—'}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <button
                              type="button"
                              onClick={handleCopyCoordinates}
                              className="text-[11px] px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 font-medium flex items-center gap-1 transition-all border border-white/[0.08]"
                            >
                              {copiedCoords ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-300">Copied JSON!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy JSON</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleAppendCoordinatesToTips}
                              className="text-[11px] px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium flex items-center gap-1 transition-all"
                            >
                              <Wand2 className="w-3 h-3" /> Append Coords to Tips
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <p className="text-[11px] text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {blueprintResult.summaryMessage}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-zinc-600 mt-1.5">
                  JPG, PNG, WebP or GIF, up to 5&nbsp;MB.
                  {editingStunt?.poseKey
                    ? ' Uploading runs AI landmark detection to generate an instant kinematic blueprint.'
                    : ' Kinematic blueprint automatically scans joint coordinates when photo is selected.'}
                </p>

                {imageError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {imageError}
                  </p>
                )}
              </div>

              {/* Reference / Demo Video Input & Real-Time Preview */}
              <PoseVideoInput
                value={formVideoUrl}
                slug={editingStunt ? editingStunt.poseKey ?? editingStunt.id : slugify(formName)}
                onChange={(data) => setFormVideoUrl(data?.rawUrl || '')}
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-zinc-500 font-bold block">Coaching Tips</label>
                  {blueprintResult?.coachingCueSuggestion && (
                    <button
                      type="button"
                      onClick={handleApplyBlueprintTips}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-all"
                    >
                      <Wand2 className="w-3 h-3" /> Auto-fill from Blueprint
                    </button>
                  )}
                </div>
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
              </div>

              {/* Pinned Sticky Footer */}
              <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#0d0d12]/90 backdrop-blur-md flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={isSaving || isUploading}
                  className="px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-bold transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading || !formName.trim() || (!formImageUrl && !pendingFile) || !formTips.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/20"
                >
                  {isUploading || isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isUploading ? 'Uploading image…' : 'Saving…'}
                    </>
                  ) : editingStunt ? (
                    'Save Changes'
                  ) : (
                    'Add to Library'
                  )}
                </button>
              </div>
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
