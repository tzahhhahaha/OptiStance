import React, { useCallback, useEffect, useState } from 'react';
import {
  Video,
  Upload,
  Search,
  ChevronDown,
  Headphones,
  Send,
  CheckCircle2,
  ArrowLeft,
  X,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Clock,
} from 'lucide-react';
import { TabType } from './BottomNavBar';
import {
  supabaseCreateSupportTicket,
  supabaseGetMyTickets,
  supabaseAddTicketReply,
  subscribeToSupportTickets,
  isAthleteReply,
  normalizeUtcIso,
  type AthleteTicketWithReplies,
  type SupportTicketStatus,
} from '../../services/supabaseApi';

interface HelpSupportScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: TabType) => void;
  onContactSupport?: () => void;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const TICKET_STATUS_META: Record<
  SupportTicketStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  open: {
    label: 'Open',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400 animate-pulse',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dotClass: 'bg-sky-400',
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
};

function formatTicketDateTime(iso: string): string {
  const ts = Date.parse(normalizeUtcIso(iso));
  if (Number.isNaN(ts)) return 'Unknown date';
  const full = new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  let rel = '';
  if (diffSec < 60) rel = 'Just now';
  else if (diffSec < 3600) rel = `${Math.floor(diffSec / 60)}m ago`;
  else if (diffSec < 86400) rel = `${Math.floor(diffSec / 3600)}h ago`;
  else rel = `${Math.floor(diffSec / 86400)}d ago`;
  return `${full} · ${rel}`;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack, onNavigateTab }) => {
  const [searchFaq, setSearchFaq] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportError, setSupportError] = useState<string | null>(null);
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [expandedTutorial, setExpandedTutorial] = useState<number | null>(null);

  // Athlete's own support tickets & Support Desk replies (strictly online-only)
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [myTickets, setMyTickets] = useState<AthleteTicketWithReplies[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  // Athlete reply drafts, keyed by ticket id
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyTicketId, setSendingReplyTicketId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<{ ticketId: string; message: string } | null>(null);

  const loadMyTickets = useCallback(async (silent = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setMyTickets([]);
      setIsLoadingTickets(false);
      return;
    }
    if (!silent) setIsLoadingTickets(true);
    try {
      const rows = await supabaseGetMyTickets();
      setMyTickets(rows);
      setExpandedTicketId((prev) => prev ?? rows[0]?.id ?? null);
    } catch {
      if (!silent) setMyTickets([]);
    } finally {
      if (!silent) setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    void loadMyTickets();
  }, [loadMyTickets]);

  // Real-time: Support Desk replies and status changes appear instantly
  useEffect(() => {
    const unsubscribe = subscribeToSupportTickets(() => {
      void loadMyTickets(true);
    });
    return unsubscribe;
  }, [loadMyTickets]);

  const handleSendTicketReply = async (e: React.FormEvent, ticketId: string) => {
    e.preventDefault();
    const text = (replyDrafts[ticketId] ?? '').trim();
    if (!text) return;
    setReplyError(null);
    setSendingReplyTicketId(ticketId);
    try {
      const created = await supabaseAddTicketReply(ticketId, text);
      setMyTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, replies: [...t.replies, created] } : t))
      );
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      void loadMyTickets(true);
    } catch (err) {
      setReplyError({
        ticketId,
        message: err instanceof Error ? err.message : 'Failed to send your reply.',
      });
    } finally {
      setSendingReplyTicketId(null);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void loadMyTickets();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setMyTickets([]);
      setShowSupportModal(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadMyTickets]);

  const faqs: FaqItem[] = [
    {
      id: 'faq-1',
      question: 'How accurate is the pose estimation?',
      answer:
        'The camera uses MediaPipe body landmarks and pose-shape heuristics. It provides an on-device estimate, not a clinically or competition-validated accuracy score. Ensure your full body is visible in the frame for best results.'
    },
    {
      id: 'faq-2',
      question: 'What gear or lighting do I need?',
      answer:
        'No special gear is required! Just a smartphone or webcam with a clean lens. For lighting, natural daylight or bright, even gym lighting works best. Avoid standing directly in front of bright windows (backlighting).'
    },
    {
      id: 'faq-3',
      question: 'Can I use the app offline?',
      answer:
        'Basic video recording and local kinematic tracking are processed completely on-device. However, cloud-synchronized telemetry exports require an active internet connection.'
    },
    {
      id: 'faq-4',
      question: 'How are ICU Compliance scores calculated?',
      answer:
        'Joint vectors captured by the MediaPipe engine are checked against International Cheer Union (ICU) Level 1 through Level 6 rubrics, scoring extension angles (180° locked lines), balance hold duration, and motion sharpness.'
    }
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchFaq.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchFaq.toLowerCase())
  );

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError(null);
    setIsSendingSupport(true);
    try {
      await supabaseCreateSupportTicket(supportSubject, supportMessage);
      setSupportSent(true);
      setSupportSubject('');
      setSupportMessage('');
      void loadMyTickets();
      setTimeout(() => {
        setSupportSent(false);
        setShowSupportModal(false);
      }, 2000);
    } catch (err) {
      // Show the real failure rather than a fake confirmation — a ticket that
      // was never stored is worse than an error the athlete can act on.
      setSupportError(err instanceof Error ? err.message : 'Failed to send your ticket.');
    } finally {
      setIsSendingSupport(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#050507] text-[#E0E0E6] flex flex-col font-sans">
      {/* Top Header with Back to Drawer Button - Safe Area Aware */}
      {onBack && (
        <header className="sticky top-0 w-full z-40 bg-[#050507]/90 backdrop-blur-2xl border-b border-white/[0.06] safe-header transition-all">
          <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
            <button
              onClick={onBack}
              aria-label="Back to Navigation Drawer"
              className="flex items-center gap-2 py-2 px-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-200 hover:text-white transition-all group active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Back to Menu</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[11px] font-extrabold tracking-widest text-zinc-400 uppercase">Help &amp; Tutorials</span>
            </div>
          </div>
        </header>
      )}

      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 pb-28">
        {/* Header Section with Cheer Graphic - Immersive UI */}
        <section className="relative rounded-3xl overflow-hidden bg-[#0d0d12]/80 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl mb-8 p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-rose-950/20 z-0 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2 block">
                Support Knowledge Base
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">
                Help &amp; Support
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
                Master your cheer kinematics with our guides and technical FAQs. We&apos;re here to support your elite training journey.
              </p>
            </div>
            <div className="w-full md:w-1/3 aspect-video md:aspect-square rounded-2xl overflow-hidden shadow-inner relative border border-white/10">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4f4-XM04Nh_vtE89eqzbrorhjaX2Of8IOIPRBqRUWItNidDhk_5ySyd8CLuRZOGft2AY6oKLlvw52sEg1P3Q3qEI76kWVqDW14mNKyogfJqhVMX4KJc5l_srPDGx9VZ8A92AF-Tzk_rHez4QU8V7bbh4TZiAdiOep8_gCOyMq2ntW7omLlBONO-n_pg4eOHq9eXxSUmeMjOe5I3czHVCYXocTUPvObdxZgFrpSg90WCcSbByppoi5"
                alt="Cheerleader Jump Execution"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

      {/* Tutorials Section (Bento Layout) */}
      <section className="space-y-4 mb-8">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">Tutorials &amp; Guides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tutorial Card 1 */}
          <div className="bg-[#0d0d12]/80 rounded-3xl border border-white/[0.08] p-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:border-white/20 transition-all">
            <button
              onClick={() => setExpandedTutorial(expandedTutorial === 1 ? null : 1)}
              className="w-full text-left space-y-3 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                  <Video className="w-6 h-6 text-indigo-400" />
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-500 transition-transform ${
                    expandedTutorial === 1 ? 'rotate-180 text-white' : ''
                  }`}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Real-time Form Analysis</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Learn how to position your camera for the most accurate live skeletal tracking.
                </p>
              </div>
            </button>

            {expandedTutorial === 1 && (
              <div className="mt-4 pt-3 border-t border-white/[0.08] text-xs text-zinc-300 space-y-2 animate-fade-in-up">
                <p>1. Place your device at hip-height roughly 8–10 feet away.</p>
                <p>2. Keep your whole body (from cheer shoes to wrists) framed inside the dashed target lines.</p>
                <p>3. Maintain good lighting without direct backlighting.</p>
              </div>
            )}
          </div>

          {/* Tutorial Card 2 */}
          <div className="bg-[#0d0d12]/80 rounded-3xl border border-white/[0.08] p-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:border-white/20 transition-all">
            <button
              onClick={() => setExpandedTutorial(expandedTutorial === 2 ? null : 2)}
              className="w-full text-left space-y-3 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                  <Upload className="w-6 h-6 text-rose-400" />
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-500 transition-transform ${
                    expandedTutorial === 2 ? 'rotate-180 text-white' : ''
                  }`}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Upload &amp; Analyze Stunts</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Step-by-step guide on uploading pre-recorded routine videos or photos.
                </p>
              </div>
            </button>

            {expandedTutorial === 2 && (
              <div className="mt-4 pt-3 border-t border-white/[0.08] text-xs text-zinc-300 space-y-2 animate-fade-in-up">
                <p>1. Tap the &apos;Upload&apos; icon in the AI Camera view.</p>
                <p>2. Select any high-resolution cheer video or photo file.</p>
                <p>3. The MediaPipe engine will overlay joints and score ICU angles instantly.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-4 mb-8">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">Frequently Asked Questions</h3>

        {/* Search FAQ */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchFaq}
            onChange={(e) => setSearchFaq(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/10 bg-[#0d0d12]/80 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400 backdrop-blur-xl"
          />
        </div>

        <div className="space-y-2.5">
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-[#0d0d12]/80 rounded-2xl border border-white/[0.08] overflow-hidden transition-all shadow-sm hover:border-white/20 backdrop-blur-xl"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isExpanded}
                  className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-xs font-bold text-white pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-white/[0.06] animate-fade-in-up">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* My Support Tickets Section */}
      <section className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">
              My Support Tickets
            </h3>
            {myTickets.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300">
                {myTickets.length}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
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
          <button
            type="button"
            onClick={() => void loadMyTickets()}
            disabled={isLoadingTickets || !isOnline}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-zinc-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingTickets ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {!isOnline ? (
          <div className="bg-[#0d0d12]/80 rounded-2xl border border-rose-500/25 p-6 text-center space-y-1.5 backdrop-blur-xl">
            <MessageSquare className="w-6 h-6 text-rose-400 mx-auto" />
            <p className="text-xs font-bold text-rose-200">Support Desk is Online-Only</p>
            <p className="text-[11px] text-zinc-400">
              Please connect to the internet to view your support tickets, check Support Desk replies, or submit a new ticket.
            </p>
          </div>
        ) : isLoadingTickets ? (
          <div className="bg-[#0d0d12]/80 rounded-2xl border border-white/[0.08] p-6 text-center text-xs text-zinc-500">
            Loading your support tickets...
          </div>
        ) : myTickets.length === 0 ? (
          <div className="bg-[#0d0d12]/80 rounded-2xl border border-white/[0.08] p-6 text-center space-y-1.5 backdrop-blur-xl">
            <MessageSquare className="w-6 h-6 text-zinc-600 mx-auto" />
            <p className="text-xs font-bold text-zinc-300">No support tickets submitted yet</p>
            <p className="text-[11px] text-zinc-500">
              When you contact the Support Desk below, your ticket status and Support Desk replies will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTickets.map((ticket) => {
              const isExpanded = expandedTicketId === ticket.id;
              const meta = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
              const replyCount = ticket.replies.filter((r) => !isAthleteReply(r, ticket.user_id)).length;

              return (
                <div
                  key={ticket.id}
                  className="bg-[#0d0d12]/80 rounded-2xl border border-white/[0.08] overflow-hidden transition-all hover:border-white/20 backdrop-blur-xl"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                    aria-expanded={isExpanded}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left focus:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white truncate">
                          {ticket.subject}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                          {meta.label}
                        </span>
                        {replyCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <Sparkles className="w-2.5 h-2.5" />
                            {replyCount} {replyCount === 1 ? 'Support Reply' : 'Support Replies'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>Submitted {formatTicketDateTime(ticket.created_at)}</span>
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] space-y-3 animate-fade-in-up">
                      {/* Athlete's Original Message */}
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-zinc-400">Your Message</span>
                          <span className="text-[10px] text-zinc-400">
                            {formatTicketDateTime(ticket.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                          {ticket.description}
                        </p>
                      </div>

                      {/* Conversation with the Support Desk */}
                      {ticket.replies.length === 0 ? (
                        <p className="text-[11px] text-zinc-500 italic pl-1">
                          Awaiting a response from the Support Desk...
                        </p>
                      ) : (
                        ticket.replies.map((reply) => {
                          const fromMe = isAthleteReply(reply, ticket.user_id);
                          return (
                            <div
                              key={reply.id}
                              className={
                                fromMe
                                  ? 'rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 mr-3'
                                  : 'rounded-xl bg-indigo-500/[0.08] border border-indigo-500/25 p-3.5 ml-3'
                              }
                            >
                              <div className="flex items-center justify-between mb-1">
                                {fromMe ? (
                                  <span className="text-[11px] font-bold text-zinc-400">You</span>
                                ) : (
                                  <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                    <span>Support Desk</span>
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-400">
                                  {formatTicketDateTime(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-100 whitespace-pre-wrap leading-relaxed">
                                {reply.message}
                              </p>
                            </div>
                          );
                        })
                      )}

                      {/* Athlete reply box */}
                      <form
                        onSubmit={(e) => void handleSendTicketReply(e, ticket.id)}
                        className="pt-2 space-y-2"
                      >
                        {ticket.status === 'resolved' && (
                          <p className="text-[10px] text-zinc-500 pl-1">
                            This ticket is resolved. Replying will re-open it for the Support Desk.
                          </p>
                        )}
                        <textarea
                          rows={2}
                          value={replyDrafts[ticket.id] ?? ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                          disabled={!isOnline || sendingReplyTicketId === ticket.id}
                          placeholder="Reply to the Support Desk..."
                          className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none disabled:opacity-50"
                        />
                        {replyError?.ticketId === ticket.id && (
                          <p className="text-[11px] text-rose-400">{replyError.message}</p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={
                              !isOnline ||
                              sendingReplyTicketId === ticket.id ||
                              !(replyDrafts[ticket.id] ?? '').trim()
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white transition-all disabled:opacity-40"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{sendingReplyTicketId === ticket.id ? 'Sending...' : 'Send Reply'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Support CTA Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-[#0d0d12]/90 to-rose-950/40 border border-white/10 p-6 md:p-8 text-white text-center flex flex-col items-center gap-4 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl mb-8">
        <div className="relative z-10 max-w-md">
          <h3 className="text-xl font-black mb-1">Still Need Help?</h3>
          <p className="text-xs md:text-sm text-zinc-400 mb-5 leading-relaxed">
            Our Support Desk is ready to assist you with any pose scoring calibrations, technical issues, or routine analysis feedback.
          </p>
          <button
            type="button"
            disabled={!isOnline}
            onClick={() => {
              if (!isOnline) return;
              // Clear any previous attempt so a stale error never greets the
              // athlete when they open the form again.
              setSupportError(null);
              setSupportSent(false);
              setShowSupportModal(true);
            }}
            className="bg-white text-black text-xs font-extrabold uppercase tracking-wider px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <Headphones className="w-4 h-4" />
            <span>{isOnline ? 'Contact Support Desk' : 'Offline — Connect to Contact Support'}</span>
          </button>
          {!isOnline && (
            <p className="text-[11px] text-amber-300/90 mt-2.5">
              Submitting support tickets requires an active internet connection.
            </p>
          )}
        </div>
      </section>

      {/* Back to Dashboard Link */}
      <div className="text-center">
        <button
          onClick={() => onNavigateTab?.('library')}
          className="inline-flex items-center gap-2 bg-white/5 text-zinc-300 hover:text-white text-xs font-bold px-6 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Contact Support Modal - Immersive UI */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-400" />
                <span>Support Desk</span>
              </h3>
              <button onClick={() => setShowSupportModal(false)} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {supportSent ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-sm text-white">Ticket Submitted!</h4>
                <p className="text-xs text-zinc-400">
                  The Support Desk will follow up shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSupport} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
                    Subject / Routine Area
                  </label>
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="e.g., Liberty Stunt Knee Calibration"
                    className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-white text-xs outline-none focus:border-indigo-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
                    Message / Question
                  </label>
                  <textarea
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe what you need assistance with..."
                    className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-white text-xs outline-none focus:border-indigo-400 resize-none"
                    required
                  />
                </div>
                {!isOnline && (
                  <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
                    You are currently offline. An active internet connection is required to send a support ticket.
                  </p>
                )}
                {supportError && (
                  <p className="text-xs text-rose-400">{supportError}</p>
                )}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSupportModal(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingSupport || !isOnline}
                    className="px-6 py-3 rounded-2xl bg-white text-black text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{!isOnline ? 'Offline (Online Only)' : isSendingSupport ? 'Sending...' : 'Send Ticket'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
