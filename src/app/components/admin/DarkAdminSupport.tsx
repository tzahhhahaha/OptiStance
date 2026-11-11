import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Headphones,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageSquare,
  User,
  Mail,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  supabaseGetAllTickets,
  supabaseUpdateTicketStatus,
  supabaseGetTicketReplies,
  supabaseAddTicketReply,
  supabaseDeleteTicket,
  supabaseDeleteTicketReply,
  subscribeToSupportTickets,
  isAthleteReply,
  normalizeUtcIso,
  type SupportTicketWithUser,
  type TicketReply,
  type SupportTicketStatus,
} from '../../../services/supabaseApi';

type FilterStatus = 'all' | SupportTicketStatus;

const STATUS_META: Record<
  SupportTicketStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    activeBtnClass: string;
  }
> = {
  open: {
    label: 'Open',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400 animate-pulse',
    activeBtnClass:
      'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dotClass: 'bg-sky-400',
    activeBtnClass:
      'bg-sky-500/20 text-sky-200 border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.15)]',
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    activeBtnClass:
      'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
  },
};

function formatRelativeTime(iso: string): string {
  const ts = Date.parse(normalizeUtcIso(iso));
  if (Number.isNaN(ts)) return 'Unknown date';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFullDateTime(iso: string): string {
  const ts = Date.parse(normalizeUtcIso(iso));
  if (Number.isNaN(ts)) return 'Unknown date';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateTimeWithRelative(iso: string): string {
  return `${formatFullDateTime(iso)} · ${formatRelativeTime(iso)}`;
}

export default function DarkAdminSupport() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [tickets, setTickets] = useState<SupportTicketWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Replies state for the active ticket
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteReplyId, setConfirmDeleteReplyId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTickets = useCallback(async (silent = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setTickets([]);
      setSelectedTicketId(null);
      setReplies([]);
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const rows = await supabaseGetAllTickets();
      setTickets(rows);
      setSelectedTicketId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Could not load support tickets.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  // Bumped by real-time events so the open thread re-fetches its replies.
  const [repliesVersion, setRepliesVersion] = useState(0);

  // Real-time: new athlete tickets, athlete replies, and status changes
  useEffect(() => {
    const unsubscribe = subscribeToSupportTickets(() => {
      void loadTickets(true);
      setRepliesVersion((v) => v + 1);
    });
    return unsubscribe;
  }, [loadTickets]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void loadTickets();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setTickets([]);
      setSelectedTicketId(null);
      setReplies([]);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadTickets]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  // Load replies whenever selectedTicketId changes
  useEffect(() => {
    setConfirmDeleteId(null);
    setConfirmDeleteReplyId(null);
    if (!selectedTicketId || !isOnline) {
      setReplies([]);
      return;
    }
    let cancelled = false;
    setIsLoadingReplies(true);
    setActionError(null);
    supabaseGetTicketReplies(selectedTicketId)
      .then((rows) => {
        if (!cancelled) {
          setReplies(rows);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setActionError(e instanceof Error ? e.message : 'Could not load replies.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReplies(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTicketId, isOnline]);

  // Silent refresh of the open thread when a real-time event arrives
  useEffect(() => {
    if (repliesVersion === 0 || !selectedTicketId || !isOnline) return;
    let cancelled = false;
    supabaseGetTicketReplies(selectedTicketId)
      .then((rows) => {
        if (!cancelled) setReplies(rows);
      })
      .catch(() => {
        // keep current thread on transient errors
      });
    return () => {
      cancelled = true;
    };
  }, [repliesVersion, selectedTicketId, isOnline]);

  const counts = useMemo(() => {
    let open = 0;
    let in_progress = 0;
    let resolved = 0;
    for (const t of tickets) {
      if (t.status === 'open') open += 1;
      else if (t.status === 'in_progress') in_progress += 1;
      else if (t.status === 'resolved') resolved += 1;
    }
    return {
      all: tickets.length,
      open,
      in_progress,
      resolved,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (!q) return true;
      const athleteName = t.users?.full_name?.toLowerCase() ?? '';
      const athleteEmail = t.users?.email?.toLowerCase() ?? '';
      return (
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        athleteName.includes(q) ||
        athleteEmail.includes(q)
      );
    });
  }, [tickets, filterStatus, searchQuery]);

  const handleStatusChange = async (ticketId: string, newStatus: SupportTicketStatus) => {
    setActionError(null);
    setIsUpdatingStatus(true);
    try {
      await supabaseUpdateTicketStatus(ticketId, newStatus);
      const updatedAt = new Date().toISOString();
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus, updated_at: updatedAt } : t))
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update ticket status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    setActionError(null);
    setIsDeleting(true);
    try {
      await supabaseDeleteTicket(ticketId);
      setTickets((prev) => {
        const remaining = prev.filter((t) => t.id !== ticketId);
        setSelectedTicketId(remaining[0]?.id ?? null);
        return remaining;
      });
      setReplies([]);
      setConfirmDeleteId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete ticket conversation.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    setActionError(null);
    setDeletingReplyId(replyId);
    try {
      await supabaseDeleteTicketReply(replyId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setConfirmDeleteReplyId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete reply.');
    } finally {
      setDeletingReplyId(null);
    }
  };

  const handleSendReply = async (e: React.FormEvent, markStatus?: SupportTicketStatus) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setActionError(null);
    setIsSendingReply(true);
    try {
      const created = await supabaseAddTicketReply(selectedTicket.id, replyText);
      setReplies((prev) => [...prev, created]);
      setReplyText('');

      const nextStatus: SupportTicketStatus | undefined =
        markStatus ?? (selectedTicket.status === 'open' ? 'in_progress' : undefined);

      if (nextStatus && nextStatus !== selectedTicket.status) {
        await supabaseUpdateTicketStatus(selectedTicket.id, nextStatus);
        const updatedAt = new Date().toISOString();
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id ? { ...t, status: nextStatus, updated_at: updatedAt } : t
          )
        );
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Headphones className="w-5 h-5 text-indigo-400" />
              <span>Support Desk Inbox</span>
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {isOnline ? 'Online' : 'Offline — Online Only'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Tickets submitted by athletes from Help &amp; Support (`public.support_tickets`)
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTickets()}
          disabled={isLoading || !isOnline}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {!isOnline && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-1.5">
          <Headphones className="w-7 h-7 text-rose-400 mx-auto" />
          <p className="text-sm font-bold text-rose-200">Support Desk Inbox is Online-Only</p>
          <p className="text-xs text-zinc-400">
            Connect to the internet to load athlete support tickets, update ticket status, or send Support Desk replies.
          </p>
        </div>
      )}

      {/* KPI Status Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`text-left rounded-2xl p-4 border transition-all backdrop-blur-xl ${
            filterStatus === 'all'
              ? 'bg-indigo-500/15 border-indigo-500/40 shadow-[0_0_25px_rgba(99,102,241,0.12)]'
              : 'bg-[#0a0a0f]/60 border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              All Tickets
            </span>
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{counts.all}</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('open')}
          className={`text-left rounded-2xl p-4 border transition-all backdrop-blur-xl ${
            filterStatus === 'open'
              ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.12)]'
              : 'bg-[#0a0a0f]/60 border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
              Open
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300">{counts.open}</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('in_progress')}
          className={`text-left rounded-2xl p-4 border transition-all backdrop-blur-xl ${
            filterStatus === 'in_progress'
              ? 'bg-sky-500/15 border-sky-500/40 shadow-[0_0_25px_rgba(56,189,248,0.12)]'
              : 'bg-[#0a0a0f]/60 border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300/90">
              In Progress
            </span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-300">{counts.in_progress}</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('resolved')}
          className={`text-left rounded-2xl p-4 border transition-all backdrop-blur-xl ${
            filterStatus === 'resolved'
              ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
              : 'bg-[#0a0a0f]/60 border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">
              Resolved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{counts.resolved}</p>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Main Split Inbox View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Column */}
        <div className="lg:col-span-5 bg-[#0a0a0f]/60 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
          {/* Search & Filter Pill Bar */}
          <div className="p-4 border-b border-white/[0.06] space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, message, or athlete..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {(['all', 'open', 'in_progress', 'resolved'] as FilterStatus[]).map((st) => {
                const active = filterStatus === st;
                const label =
                  st === 'all' ? 'All' : STATUS_META[st].label;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                      active
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {label} ({counts[st]})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ticket Items */}
          <div className="divide-y divide-white/[0.05] max-h-[560px] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-10 text-center">
                <Headphones className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-zinc-300">No support tickets found</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {tickets.length === 0
                    ? 'When athletes submit a message in Help & Support, it will appear here.'
                    : 'Try clearing your search or switching the status filter.'}
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = ticket.id === selectedTicketId;
                const meta = STATUS_META[ticket.status] ?? STATUS_META.open;
                const athleteName = ticket.users?.full_name || 'Athlete';
                const athleteEmail = ticket.users?.email || '';

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left p-4 transition-all hover:bg-white/[0.04] ${
                      isSelected
                        ? 'bg-indigo-500/[0.09] border-l-2 border-l-indigo-400'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-white line-clamp-1">
                        {ticket.subject}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${meta.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                        {meta.label}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 mb-2.5 leading-relaxed">
                      {ticket.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="truncate max-w-[55%]">
                        {athleteName}
                        {athleteEmail ? ` · ${athleteEmail}` : ''}
                      </span>
                      <span className="shrink-0">
                        {formatDateTimeWithRelative(ticket.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Reply Column */}
        <div className="lg:col-span-7 bg-[#0a0a0f]/60 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
          {!selectedTicket ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-zinc-300">Select a ticket to inspect</p>
              <p className="text-xs text-zinc-500 mt-1">
                View athlete details, update ticket status, or send a Support Desk reply.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Ticket Header */}
              <div className="p-6 border-b border-white/[0.06] space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        Ticket #{selectedTicket.id.slice(0, 8)}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-[11px] text-zinc-400">
                        Submitted {formatDateTimeWithRelative(selectedTicket.created_at)}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-white tracking-tight">
                      {selectedTicket.subject}
                    </h4>
                  </div>

                  {/* Status Switcher & Delete Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
                      {(['open', 'in_progress', 'resolved'] as SupportTicketStatus[]).map((st) => {
                        const active = selectedTicket.status === st;
                        const meta = STATUS_META[st];
                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={isUpdatingStatus || !isOnline}
                            onClick={() => void handleStatusChange(selectedTicket.id, st)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-40 ${
                              active
                                ? meta.activeBtnClass
                                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={isDeleting || !isOnline}
                      onClick={() =>
                        setConfirmDeleteId(
                          confirmDeleteId === selectedTicket.id ? null : selectedTicket.id
                        )
                      }
                      title="Delete entire ticket conversation"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[11px] font-bold text-rose-300 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {confirmDeleteId === selectedTicket.id && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-xs text-rose-100">
                    <span>
                      Permanently delete this ticket and all replies for both Admin and Athlete?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 font-bold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting || !isOnline}
                        onClick={() => void handleDeleteTicket(selectedTicket.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Athlete Info Bar */}
                <div className="flex flex-wrap items-center gap-4 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedTicket.users?.full_name || 'Athlete'}</span>
                  </div>
                  {selectedTicket.users?.email && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{selectedTicket.users.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversation Thread */}
              <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
                {/* Original Athlete Ticket Message */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-300">
                      {selectedTicket.users?.full_name || 'Athlete'} (Original Request)
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {formatDateTimeWithRelative(selectedTicket.created_at)}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Replies */}
                {isLoadingReplies ? (
                  <div className="text-xs text-zinc-500 py-4 text-center">
                    Loading replies...
                  </div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-zinc-500">
                      No replies yet. Send a Support Desk response below.
                    </p>
                  </div>
                ) : (
                  replies.map((reply) => {
                    const fromAthlete = isAthleteReply(reply, selectedTicket.user_id);
                    return (
                    <div
                      key={reply.id}
                      className={
                        fromAthlete
                          ? 'rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 mr-4'
                          : 'rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/25 p-4 ml-4'
                      }
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        {fromAthlete ? (
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{selectedTicket.users?.full_name || 'Athlete'}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Support Desk</span>
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400">
                            {formatDateTimeWithRelative(reply.created_at)}
                          </span>
                          {confirmDeleteReplyId === reply.id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-500/15 border border-rose-500/30 rounded-lg px-2 py-0.5 text-[10px]">
                              <span className="text-rose-200 font-bold mr-1">Delete?</span>
                              <button
                                type="button"
                                disabled={deletingReplyId === reply.id || !isOnline}
                                onClick={() => void handleDeleteReply(reply.id)}
                                className="px-1.5 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all disabled:opacity-50"
                              >
                                {deletingReplyId === reply.id ? '...' : 'Yes'}
                              </button>
                              <button
                                type="button"
                                disabled={deletingReplyId === reply.id}
                                onClick={() => setConfirmDeleteReplyId(null)}
                                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-zinc-200 font-bold transition-all"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => setConfirmDeleteReplyId(reply.id)}
                              title="Delete this reply"
                              className="p-1 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
                        {reply.message}
                      </p>
                    </div>
                    );
                  })
                )}
              </div>

              {/* Reply Composer */}
              <form
                onSubmit={(e) => void handleSendReply(e)}
                className="p-6 border-t border-white/[0.06] bg-[#0d0d14]/60 space-y-3"
              >
                {!isOnline && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    You are currently offline. An active internet connection is required to send replies or change ticket status.
                  </div>
                )}

                {actionError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {actionError}
                  </div>
                )}

                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Reply to Athlete
                </label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={!isOnline}
                  placeholder={
                    isOnline
                      ? 'Write a helpful response or troubleshooting steps...'
                      : 'Connect to the internet to reply...'
                  }
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-xs md:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none disabled:opacity-50"
                />

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  {selectedTicket.status !== 'resolved' && (
                    <button
                      type="button"
                      disabled={isSendingReply || !replyText.trim() || !isOnline}
                      onClick={(e) => void handleSendReply(e, 'resolved')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-all disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Send &amp; Mark Resolved</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim() || !isOnline}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-95 text-xs font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{!isOnline ? 'Offline (Online Only)' : isSendingReply ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
