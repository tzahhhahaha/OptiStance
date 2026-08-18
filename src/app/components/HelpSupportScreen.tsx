import React, { useState } from 'react';
import {
  HelpCircle,
  Video,
  Upload,
  Search,
  ChevronDown,
  Headphones,
  Send,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Info,
  X
} from 'lucide-react';
import { TabType } from './BottomNavBar';

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

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack, onNavigateTab, onContactSupport }) => {
  const [searchFaq, setSearchFaq] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [expandedTutorial, setExpandedTutorial] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      id: 'faq-1',
      question: 'How accurate is the pose estimation?',
      answer:
        'Our AI model is trained on thousands of elite cheerleading routines and boasts a 95% accuracy rate under optimal lighting conditions. Ensure your full body is visible in the frame for best results.'
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
        'Basic video recording and local kinematic tracking are processed completely on-device. However, cloud-synchronized coach telemetry exports require an active internet connection.'
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

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSent(true);
    setTimeout(() => {
      setSupportSent(false);
      setShowSupportModal(false);
    }, 2000);
  };

  return (
    <div className="w-full min-h-screen bg-[#050507] text-[#E0E0E6] flex flex-col font-sans">
      {/* Top Header with Back to Drawer Button */}
      {onBack && (
        <header className="sticky top-0 w-full z-40 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/[0.06] px-4 md:px-8 h-16 flex items-center justify-between transition-all">
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
        </header>
      )}

      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 pb-28">
        {/* Header Section with Cheer Graphic - Immersive UI */}
        <section className="relative rounded-3xl overflow-hidden bg-[#0d0d12]/80 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl mb-8 p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-rose-950/20 z-0 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2 block">
                Coaching Knowledge Base
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

      {/* Support CTA Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-[#0d0d12]/90 to-rose-950/40 border border-white/10 p-6 md:p-8 text-white text-center flex flex-col items-center gap-4 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl mb-8">
        <div className="relative z-10 max-w-md">
          <h3 className="text-xl font-black mb-1">Still Need Help?</h3>
          <p className="text-xs md:text-sm text-zinc-400 mb-5 leading-relaxed">
            Our coaching support desk is ready to assist you with any pose scoring calibrations, technical issues, or routine analysis feedback.
          </p>
          <button
            onClick={() => setShowSupportModal(true)}
            className="bg-white text-black text-xs font-extrabold uppercase tracking-wider px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <Headphones className="w-4 h-4" />
            <span>Contact Support Desk</span>
          </button>
        </div>
      </section>

      {/* Back to Dashboard Link */}
      <div className="text-center">
        <button
          onClick={() => onNavigateTab('library')}
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
                <span>Coach Support Desk</span>
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
                  A cheer technical specialist will follow up shortly.
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
                    placeholder="Describe what you need assistance with..."
                    className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-white text-xs outline-none focus:border-indigo-400 resize-none"
                    required
                  />
                </div>
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
                    className="px-6 py-3 rounded-2xl bg-white text-black text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Ticket</span>
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

