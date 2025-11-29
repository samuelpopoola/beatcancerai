import React, { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { 
  Activity, 
  Shield, 
  Brain, 
  Heart, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Menu, 
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  Play,
  TrendingUp,
} from 'lucide-react';

const LandingPage: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const techPillars = [
    {
      title: 'Unified Patient Graph',
      description: 'Connect pathology, genomics, labs, and specialist notes into a living longitudinal record that the AI reasons over in seconds.',
      metric: '48%',
      metricLabel: 'faster care decisions',
    },
    {
      title: 'Multi-Agent AI Board',
      description: 'Specialized oncology, radiology, and pharmacology agents collaborate to stress-test every recommendation before it reaches your team.',
      metric: '6x',
      metricLabel: 'richer clinical context',
    },
    {
      title: 'Clinician-In-The-Loop',
      description: 'Every insight is co-signed by your care team with version history, so nothing leaves the safety of human review.',
      metric: '0',
      metricLabel: 'black-box decisions',
    },
  ];
  const testimonials = [
    {
      quote: 'Beat Cancer AI translated a 200-page pathology dossier into a plan my entire team could act on the same morning. The precision is unreal.',
      name: 'Dr. Aisha Morgan',
      title: 'Head Oncologist, UCSF',
      badge: 'Care Team Partner',
    },
    {
      quote: 'For my family, it felt like stepping into the future of medicine—constant monitoring, compassionate nudges, and zero guesswork.',
      name: 'Laura Bennett',
      title: 'Caregiver & Advocate',
      badge: 'Family Program',
    },
    {
      quote: 'Clinical trial matching used to take weeks. Now we surface viable options in hours with documented rationale for every choice.',
      name: 'Dr. Nikhil Rao',
      title: 'Medical Director, New Hope Center',
      badge: 'Innovation Cohort',
    },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white font-sans selection:bg-blue-500/30 transition-colors duration-300">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/10 dark:bg-teal-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 w-[60%] h-[60%] bg-indigo-500/5 dark:bg-indigo-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative bg-gradient-to-br from-blue-600 to-teal-500 p-2.5 rounded-xl">
                  <Heart className="w-6 h-6 text-white fill-white/20" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600 dark:from-white dark:to-slate-400">
                Beat Cancer AI
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'Technology', 'Stories', 'FAQ'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors relative group">
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full" />
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle />
              <button 
                onClick={onLoginClick}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Sign in
              </button>
              <button 
                onClick={onLoginClick}
                className="group relative px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>

            <div className="md:hidden flex items-center gap-4">
              <ThemeToggle />
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-900 dark:text-white p-2">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#0B0F19] border-b border-slate-200 dark:border-white/10 p-4 animate-in slide-in-from-top-5 shadow-xl">
            <div className="flex flex-col space-y-4">
              {['Features', 'Technology', 'Stories', 'FAQ'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>
                  {item}
                </a>
              ))}
              <div className="h-px bg-slate-200 dark:bg-white/10 my-2" />
              <button onClick={onLoginClick} className="w-full py-3 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl">
                Sign in
              </button>
              <button onClick={onLoginClick} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium mb-8 animate-fade-in-up">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                AI-Powered Oncology Assistant 2.0
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1] text-slate-900 dark:text-white">
                Your Personal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 dark:from-blue-400 dark:via-teal-400 dark:to-emerald-400">
                  Cancer Care Team
                </span>
                <br />
                Powered by AI.
              </h1>
              
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Navigate your treatment journey with confidence. Advanced AI analyzes your medical records to provide personalized insights, trial matching, and 24/7 monitoring.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button 
                  onClick={onLoginClick}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold text-lg transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.3)] dark:shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] flex items-center justify-center gap-2 group"
                >
                  Start Free Assessment
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-8 py-4 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold text-lg transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  Watch Demo
                </button>
              </div>

              <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 opacity-50 grayscale">
                {/* Trust Indicators */}
                <div className="text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400">TRUSTED BY PATIENTS AT</div>
                <div className="h-8 w-px bg-slate-300 dark:bg-white/20" />
                <div className="flex gap-6 text-slate-700 dark:text-slate-300">
                  <span className="font-bold">MAYO CLINIC</span>
                  <span className="font-bold">JOHNS HOPKINS</span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="relative z-10 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-2 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-slate-50 dark:bg-[#0B0F19] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
                  {/* Mock UI Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    <div className="text-xs text-slate-500 font-mono">analysis_report_v2.pdf</div>
                  </div>
                  
                  {/* Mock UI Content */}
                  <div className="p-8 space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="space-y-2 w-full">
                        <div className="h-4 w-1/3 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                        <div className="h-20 w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-transparent rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          Based on the latest pathology report, the tumor markers indicate a positive response to the current immunotherapy regimen. Recommended next steps include...
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/5">
                        <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Vital Status</div>
                        <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">Stable</div>
                        <div className="w-full bg-slate-100 dark:bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full w-[85%]" />
                        </div>
                      </div>
                      <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/5">
                        <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Next Appointment</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">Oct 24</div>
                        <div className="text-xs text-slate-500">Dr. Sarah Chen</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-10 -right-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl animate-bounce-slow z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 dark:bg-green-500/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Match Found</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Clinical Trial #442</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-24 bg-slate-50 dark:bg-[#0B0F19] relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              Complete Care <span className="text-blue-600 dark:text-blue-500">Orchestration</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              Everything you need to manage your treatment, all in one intelligent dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Large Card */}
            <div className="md:col-span-2 row-span-1 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-100 dark:group-hover:bg-blue-600/20 transition-all" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">AI Medical Analysis</h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-md">Upload complex medical documents and get instant, plain-English summaries. Our AI identifies key insights, risks, and opportunities in your medical history.</p>
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform cursor-pointer">
                  Try Demo <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Tall Card */}
            <div className="md:col-span-1 row-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 relative overflow-hidden group hover:border-teal-500/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1">
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-teal-50 dark:from-teal-900/20 to-transparent" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 bg-teal-50 dark:bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Real-time Monitoring</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Track symptoms, medications, and vitals with smart alerts.</p>
                
                <div className="mt-auto space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-white/5">
                      <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <div className="h-2 w-20 bg-slate-200 dark:bg-white/10 rounded" />
                      <div className="ml-auto h-2 w-8 bg-slate-200 dark:bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Small Card 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 group hover:border-purple-500/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">HIPAA Secure</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Bank-level encryption for all your sensitive data.</p>
            </div>

            {/* Small Card 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 group hover:border-orange-500/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Care Team Sync</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Share reports instantly with your oncologist.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Active Patients', value: '10,000+' },
              { label: 'Medical Reports Analyzed', value: '500k+' },
              { label: 'Clinical Trials Matched', value: '1,200+' },
              { label: 'Hospital Partners', value: '50+' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{stat.value}</div>
                <div className="text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="py-24 bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-[#030712] dark:via-[#0B0F19] dark:to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 dark:opacity-60" aria-hidden>
          <div className="absolute inset-y-0 left-1/2 w-[40rem] -translate-x-1/2 bg-gradient-to-b from-blue-200/40 via-teal-200/20 to-transparent dark:from-blue-600/30 dark:via-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-emerald-200/30 dark:bg-emerald-500/20 blur-[140px]" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.3em] text-blue-600 dark:text-blue-400 mb-4">TECHNOLOGY STACK</p>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Clinical-grade intelligence, beautifully orchestrated
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Every insight is generated through a transparent, multi-layer review pipeline so patients and clinicians always understand the "why" behind the guidance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {techPillars.map((pillar) => (
              <div key={pillar.title} className="relative rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl p-8 shadow-xl shadow-blue-900/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-xs uppercase tracking-[0.4em] text-slate-400">PILLAR</div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pillar.metric}</div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">{pillar.metricLabel}</div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{pillar.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{pillar.description}</p>
                <div className="mt-8 flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                  <span className="h-1 w-10 bg-gradient-to-r from-blue-600 to-teal-500 rounded-full" />
                  Read technical brief
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 grid md:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-teal-500/60 mix-blend-screen opacity-70" />
              <div className="relative">
                <p className="text-sm uppercase tracking-[0.35em] text-white/60 mb-3">ZERO TRUST SECURITY</p>
                <h3 className="text-2xl font-semibold mb-4">HIPAA, SOC 2, and GDPR aligned from day zero</h3>
                <p className="text-white/80 leading-relaxed mb-6">
                  Fine-grained data access ensures each document, image, or lab result is shared only with the clinicians you approve. Every action is logged for audit in real time.
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-blue-100">
                  {['Hardware encryption enclave', 'Rotating access keys', 'Human-in-the-loop review'].map((label) => (
                    <span key={label} className="px-3 py-1 rounded-full bg-white/10 border border-white/20">{label}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-4">REVIEW CADENCE</p>
              <div className="space-y-6">
                {[
                  { title: 'Ingest & Normalize', detail: 'Medical PDFs, FHIR feeds, and imaging notes are standardized within seconds.', duration: 'T+2 min' },
                  { title: 'AI Board Analysis', detail: 'Multi-agent review surfaces risks, drug conflicts, and emergent trends.', duration: 'T+6 min' },
                  { title: 'Clinician Sign-off', detail: 'Your care team receives a curated briefing with recommended actions.', duration: 'T+12 min' },
                ].map((step) => (
                  <div key={step.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center font-semibold text-blue-600 dark:text-blue-400">
                      {step.duration}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">{step.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stories Section */}
      <section id="stories" className="py-24 bg-white dark:bg-[#030712]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-emerald-500 mb-3">REAL STORIES</p>
              <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white max-w-2xl">
                Compassion engineered into every touchpoint
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl">
              Patients, caregivers, and clinicians co-design every release. Here is how the platform shifts what care feels like in the moments that matter most.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((story) => (
              <div key={story.name} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-white to-slate-50 dark:from-white/10 dark:to-white/5 p-8 shadow-xl">
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">{story.badge}</div>
                <p className="text-slate-900 dark:text-slate-100 text-lg leading-relaxed mb-6">
                  “{story.quote}”
                </p>
                <div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">{story.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{story.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How accurate is the AI analysis?", a: "Our AI models are trained on millions of anonymized medical records and validated by leading oncologists. While highly accurate, it is designed to support, not replace, your medical team." },
              { q: "Is my data really private?", a: "Absolutely. We use end-to-end encryption and are fully HIPAA compliant. Your data is never sold to third parties." },
              { q: "Can I use this for any type of cancer?", a: "Yes, our system supports all major cancer types, with specialized models for the most common forms including breast, lung, prostate, and colorectal cancer." },
            ].map((faq, i) => (
              <div key={i} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/[0.02] shadow-sm">
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-medium text-lg text-slate-900 dark:text-white">{faq.q}</span>
                  {activeFaq === i ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {activeFaq === i && (
                  <div className="p-6 pt-0 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-50 dark:bg-blue-600/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h2 className="text-4xl lg:text-5xl font-bold mb-8 text-slate-900 dark:text-white leading-tight">
                Ready to take control of your journey?
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
                Join thousands of patients using AI to navigate their cancer care with clarity, confidence, and peace of mind.
              </p>
              <button 
                onClick={onLoginClick}
                className="px-10 py-5 bg-blue-600 dark:bg-white text-white dark:text-blue-900 rounded-full font-bold text-xl hover:bg-blue-700 dark:hover:bg-blue-50 transition-all shadow-2xl shadow-blue-900/20"
              >
                Get Started Now
              </button>
            </div>
            
            <div className="lg:w-1/2 relative flex justify-center">
              {/* Mobile Phone Mockup */}
              <div className="relative w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden transform rotate-[-5deg] hover:rotate-0 transition-transform duration-500">
                {/* Screen Content */}
                <div className="absolute inset-0 bg-slate-50 dark:bg-[#0B0F19] overflow-hidden flex flex-col">
                  {/* Status Bar */}
                  <div className="h-8 bg-slate-900 w-full absolute top-0 z-20 flex justify-center">
                    <div className="w-32 h-6 bg-slate-800 rounded-b-xl"></div>
                  </div>
                  
                  {/* App Content */}
                  <div className="pt-12 px-5 pb-6 h-full overflow-y-auto no-scrollbar">
                    {/* Header */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, Alex</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Here's your personalized care overview</p>
                    </div>

                    {/* Stats Grid - Mobile Stack */}
                    <div className="space-y-3 mb-6">
                      {/* Upcoming - Blue */}
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-medium opacity-90">Upcoming</span>
                          </div>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Today</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-2xl font-bold">3</div>
                            <div className="text-[10px] opacity-80">Scheduled Events</div>
                          </div>
                          <div className="h-8 w-16 bg-white/10 rounded flex items-end gap-0.5 px-1 pb-1">
                            <div className="w-1/4 h-1/2 bg-white/50 rounded-sm"></div>
                            <div className="w-1/4 h-3/4 bg-white/70 rounded-sm"></div>
                            <div className="w-1/4 h-full bg-white rounded-sm"></div>
                            <div className="w-1/4 h-2/3 bg-white/60 rounded-sm"></div>
                          </div>
                        </div>
                      </div>

                      {/* Active - Green */}
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-medium opacity-90">Active Meds</span>
                          </div>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">On Track</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-2xl font-bold">5</div>
                            <div className="text-[10px] opacity-80">Medications</div>
                          </div>
                          <div className="h-8 w-8 rounded-full border-2 border-white/30 flex items-center justify-center">
                            <span className="text-[10px] font-bold">100%</span>
                          </div>
                        </div>
                      </div>

                      {/* Tracker - Purple */}
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-medium opacity-90">Tracker</span>
                          </div>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Weekly</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-2xl font-bold">Stable</div>
                            <div className="text-[10px] opacity-80">Symptom Status</div>
                          </div>
                          <Activity className="w-8 h-8 opacity-50" />
                        </div>
                      </div>
                    </div>

                    {/* AI Insights Section */}
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">AI Insights</h4>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Treatment Progress</div>
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight mt-1">
                                Lab results show positive response to current protocol.
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500">
                          <div className="flex items-start gap-2">
                            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Upcoming Screening</div>
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight mt-1">
                                Follow-up CT scan recommended within 2 weeks.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Events List */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Upcoming Events</h4>
                      <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 p-1">
                        <div className="flex items-center p-3 gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Chemotherapy Session</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">Tomorrow at 9:00 AM</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Nav */}
                  <div className="absolute bottom-0 w-full h-14 bg-white dark:bg-[#0B0F19] border-t border-slate-100 dark:border-white/5 flex justify-around items-center px-6 z-10">
                    <div className="text-blue-600 dark:text-blue-400"><Activity className="w-5 h-5" /></div>
                    <div className="text-slate-300 dark:text-slate-600"><Calendar className="w-5 h-5" /></div>
                    <div className="text-slate-300 dark:text-slate-600"><Users className="w-5 h-5" /></div>
                  </div>
                </div>
              </div>
              
              {/* Decorative Elements behind phone */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[650px] bg-blue-500/20 rounded-full blur-[80px]"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 dark:border-white/5 py-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-500" fill="currentColor" />
            <span className="font-bold text-white text-lg">Beat Cancer AI</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div>© 2025 Beat Cancer AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
