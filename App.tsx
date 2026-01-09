
import React, { useState, useEffect } from 'react';
import { TherapySpace } from './components/TherapySpace';
import { Journal } from './components/Journal';
import { Logo } from './components/Logo';
import { 
  Brain, Sparkles, Heart, Menu, X, BookHeart, 
  Shield, Lock, UserCheck, Palette, ShieldAlert
} from 'lucide-react';

type Tab = 'home' | 'session' | 'journal';
type Theme = 'midnight' | 'forest' | 'rose' | 'lavender';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('nova_theme') as Theme) || 'midnight';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('nova_theme', theme);
  }, [theme]);

  const themes: { id: Theme; label: string; color: string }[] = [
    { id: 'midnight', label: 'Midnight Blue', color: '#0ea5e9' },
    { id: 'forest', label: 'Forest Green', color: '#10b981' },
    { id: 'rose', label: 'Sunset Rose', color: '#fb7185' },
    { id: 'lavender', label: 'Lavender Peace', color: '#a78bfa' },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen auth-gradient flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md glass-panel rounded-[3rem] p-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <Logo size={80} className="mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-2 tracking-tight">NOVA CARE AI</h1>
            <p className="text-slate-400 font-medium">Empathetic Therapy & Support.</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => setIsAuthenticated(true)}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-bold transition-all"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="Google" />
              Continue with Google
            </button>
            <button 
              onClick={() => setIsAuthenticated(true)}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl font-bold transition-all"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="w-6 h-6 invert" alt="Apple" />
              Continue with Apple
            </button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-slate-500">
            <div className="flex flex-col items-center gap-1">
              <Shield size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Secure</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Lock size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Private</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <UserCheck size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Safe</span>
            </div>
          </div>
          
          <p className="mt-8 text-center text-xs text-slate-500 leading-relaxed px-4">
            Nova Care AI provides compassionate support and stabilization. Explore your therapy history anytime.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'session': return <TherapySpace />;
      case 'journal': return <Journal />;
      default:
        return (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm font-bold mb-6" style={{ color: 'var(--primary)' }}>
                <Sparkles size={16} /> Psychological First Aid Framework
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                Immediate Support <br />
                <span style={{ color: 'var(--primary)' }}>When You Need It Most</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                NOVA CARE AI is your bridge to clarity. We stabilize distress, ground your emotions, and help you find the path back to calm.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => setActiveTab('session')}
                  className="px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-xl"
                  style={{ backgroundColor: 'var(--primary)', color: '#000' }}
                >
                  Start Therapy Session
                </button>
                <button
                  onClick={() => setActiveTab('journal')}
                  className="bg-white/5 border border-white/10 px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all transform hover:scale-105"
                  style={{ color: 'var(--primary)' }}
                >
                  Personal Reflection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <div className="glass-panel p-10 rounded-[2.5rem] hover:bg-white/10 transition-all duration-300">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6" style={{ color: 'var(--primary)' }}>
                  <Brain size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Severity Staging</h3>
                <p className="text-slate-400 leading-relaxed">Nova assesses your distress level early on to provide appropriate support or guide you to professional help.</p>
              </div>
              <div className="glass-panel p-10 rounded-[2.5rem] hover:bg-white/10 transition-all duration-300">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6" style={{ color: 'var(--primary)' }}>
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Therapy History</h3>
                <p className="text-slate-400 leading-relaxed">Keep track of your journey. All past sessions are saved so you can review themes and progress over time.</p>
              </div>
              <div className="glass-panel p-10 rounded-[2.5rem] hover:bg-white/10 transition-all duration-300">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6" style={{ color: 'var(--primary)' }}>
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Bridge to Care</h3>
                <p className="text-slate-400 leading-relaxed">Designed as a stabilization tool. When your distress exceeds stage 3, we prioritize your safety and professional connection.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col theme-transition">
      <nav className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <Logo size={40} />
            <span className="text-2xl font-bold tracking-tight uppercase tracking-[0.2em] text-lg hidden sm:block">NOVA CARE</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setActiveTab('home')} className={`font-semibold transition-colors ${activeTab === 'home' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Home</button>
            <button onClick={() => setActiveTab('session')} className={`font-semibold transition-colors ${activeTab === 'session' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Therapy Session</button>
            <button onClick={() => setActiveTab('journal')} className={`font-semibold transition-colors ${activeTab === 'journal' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Reflection</button>
            
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-full border border-white/10">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className={`w-6 h-6 rounded-full transition-all transform hover:scale-125 ${theme === t.id ? 'ring-2 ring-white scale-110' : 'opacity-40 hover:opacity-100'}`}
                  style={{ backgroundColor: t.color }}
                />
              ))}
            </div>

            <button onClick={() => window.open('https://988lifeline.org', '_blank')} className="bg-red-500/10 text-red-400 px-5 py-2 rounded-full font-bold text-sm hover:bg-red-500/20 transition-all border border-red-500/20">Crisis Help</button>
          </div>

          <button className="md:hidden p-2 text-slate-400" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      <main className="flex-grow pt-8 pb-24">
        {renderContent()}
      </main>

      <footer className="bg-black/20 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
              <Logo size={24} />
              <span className="font-bold text-lg uppercase tracking-widest">NOVA CARE AI</span>
            </div>
            <p className="text-slate-500 text-sm">Compassionate Support & Therapy History Companion.</p>
          </div>
          <div className="text-center md:text-right space-y-2">
            <p className="text-slate-600 text-[10px] max-w-xs md:ml-auto">NOVA CARE AI is an empathetic support tool. Providing stabilization for Stage 1-3 distress.</p>
            <p className="text-slate-600 text-xs">© 2024 NOVA CARE AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
