
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Send, User, Sparkles, Loader2, Mic, MicOff, Settings2, Upload, Volume2, CheckCircle2, AlertCircle, Play, Square, UserCircle, ShieldAlert, ChevronRight, Info, X, Heart, UserPlus, ArrowRight } from 'lucide-react';
import { decode, encode, decodeAudioData, createPcmBlob } from '../utils/audio';
import { SessionControls } from './SessionControls';
import { CrisisModal } from './CrisisModal';
import { Message, UserProfile, IntensityStage } from '../types';

const BASE_INSTRUCTION = `You are NOVA CARE AI — a psychological first-aid AI designed to provide immediate emotional support, grounding, and clarity during moments of distress. You are NOT a therapist, psychologist, psychiatrist, or medical professional, and you do NOT provide treatment or long-term mental health solutions.

CORE PURPOSE — FIRST AID ONLY
Your role is to stabilize, ground, and support users emotionally in the moment.
You reduce immediate distress and help users regain clarity.
You do NOT aim to diagnose, cure, or treat mental health conditions.
You act as a bridge toward appropriate human or professional support when needed.

MAXIMUM SCOPE OF SUPPORT
- NOVA CARE AI supports up to Stage 3 distress only.
- Any distress above Stage 3 is considered outside your scope and must be escalated to licensed professionals or emergency services.
- You must clearly communicate this boundary when escalation is required.

SEVERITY STAGING FRAMEWORK (INTERNAL)
Stage 1 — Mild Distress: temporary stress, light anxiety, confusion, mild sadness, everyday overwhelm.
Stage 2 — Moderate Distress: persistent anxiety, emotional exhaustion, rumination, loneliness, academic or work pressure, relationship strain.
Stage 3 — High but Non-Critical Distress: feeling stuck, emotionally overwhelmed, hopeless thoughts WITHOUT intent, loss of motivation.
Stage 4+ — Critical / Out of Scope: suicidal ideation, self-harm intent, planning, imminent danger.

ESCALATION RULE (STRICT)
If the user shows signs of Stage 4 or higher:
1. Clearly state that this level of distress is beyond first aid.
2. Say explicitly that you are not enough for this situation.
3. Ask one direct safety question: “Are you safe right now?”
4. Encourage immediate contact with local emergency services.
5. Encourage reaching out to a trusted person immediately.
6. Keep responses short, serious, and supportive.
7. Stop all non-essential guidance.

COMMUNICATION STYLE — FIRST AID TONE
- Calm, grounded, non-judgmental.
- Lead with empathy before guidance.
- Short-to-medium responses.
- Ask at most one question at a time unless safety requires more.
- Focus on the present moment and immediate support.
- Avoid clinical jargon and diagnosis language.

USER PROFILE CONTEXT HANDLING
The user may provide optional profile information during account setup, including age range, primary role (e.g., student, employed), sub-category details, and free-text context.
Rules:
- Profile data is used ONLY to tailor tone, examples, and relevance.
- Never diagnose, stereotype, or assume mental state based on profile.
- If profile seems inaccurate, invite correction gently.
- If profile is missing or cleared, proceed with neutral defaults.
- Profile information may be changed at any time via Settings and must be respected immediately.
- If user is "Under 18" -> Use extra caution, simpler language, and earlier escalation if risk detected.`;

const AGE_RANGES = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55+', 'Prefer not to say'];
const ROLES = ['Student', 'Employed', 'Self-employed / Entrepreneur', 'Unemployed / Between jobs', 'Caregiver', 'Homemaker', 'Retired', 'Other'];

const STUDENT_LEVELS = ['School (primary / secondary)', 'College / Diploma', 'University / Degree', 'Postgraduate', 'Prefer not to say'];
const STUDENT_STRESS = ['Exams / grades', 'Academic pressure', 'Career uncertainty', 'Financial stress', 'Time management', 'Peer / social pressure', 'Family expectations'];

const WORK_TYPES = ['Office / Corporate', 'Technical / Skilled labor', 'Service / Hospitality', 'Healthcare', 'Education', 'Creative / Media', 'Government / Public service', 'Other'];
const WORK_STRESS = ['Burnout / workload', 'Job security', 'Manager / team conflict', 'Work–life balance', 'Career growth', 'Financial pressure'];

const CARE_ROLES = ['Parent', 'Elder care', 'Sick family member', 'Multiple roles'];
const CARE_CHALLENGES = ['Emotional exhaustion', 'Time pressure', 'Financial strain', 'Lack of support'];

const PREBUILT_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Eos'];

export const TherapySpace: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [showCrisis, setShowCrisis] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [customVoice, setCustomVoice] = useState<{ name: string; url: string } | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('nova_v3_profile');
    return saved ? JSON.parse(saved) : {};
  });

  const [intensity, setIntensity] = useState<IntensityStage | null>(null);
  const [hasCompletedTriage, setHasCompletedTriage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hi, I'm Nova. I'm here to support you right now. Before we continue, can you tell me how intense this feels for you today — manageable, heavy, or overwhelming?",
      timestamp: new Date()
    }
  ]);

  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const textChatRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('nova_v3_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, transcription]);

  const getSystemInstruction = useCallback(() => {
    let context = `\n\nUSER CONTEXT:\n`;
    if (userProfile.ageRange) context += `- Age Range: ${userProfile.ageRange}\n`;
    if (userProfile.primaryRole) context += `- Role: ${userProfile.primaryRole}\n`;
    if (userProfile.educationLevel) context += `- Education: ${userProfile.educationLevel}\n`;
    if (userProfile.workType) context += `- Work Type: ${userProfile.workType}\n`;
    if (userProfile.careRole) context += `- Care Role: ${userProfile.careRole}\n`;
    if (userProfile.stressFocus?.length) context += `- Main focus areas: ${userProfile.stressFocus.join(', ')}\n`;
    if (userProfile.additionalContext) context += `- Personal note: ${userProfile.additionalContext}\n`;
    if (intensity) context += `- Current Distress Intensity: Stage ${intensity}\n`;
    
    return BASE_INSTRUCTION + context;
  }, [userProfile, intensity]);

  const handleTriageResponse = async (level: IntensityStage) => {
    setIntensity(level);
    setHasCompletedTriage(true);
    
    const label = level === 1 ? "Manageable" : level === 2 ? "Heavy" : level === 3 ? "Overwhelming" : "Critical";
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: label, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    // Check if we should prompt for profile
    if (!userProfile.hasCompletedSetup) {
      setShowProfileSetup(true);
    } else {
      await sendToModel(userMsg.content);
    }
  };

  const sendToModel = async (content: string) => {
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      textChatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: getSystemInstruction() }
      });
      const response = await textChatRef.current.sendMessage({ message: content });
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: response.text || "I'm here.", timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      setError('Connection issue.');
    } finally {
      setIsTyping(false);
    }
  };

  const finalizeProfileSetup = () => {
    setUserProfile({ ...userProfile, hasCompletedSetup: true });
    setShowProfileSetup(false);
    sendToModel("I've finished setting up my profile. Let's continue.");
  };

  const playVoiceSample = async (voiceName: string) => {
    if (previewingVoice === voiceName) {
      if (previewSourceRef.current) { previewSourceRef.current.stop(); previewSourceRef.current = null; }
      setPreviewingVoice(null); return;
    }
    if (previewSourceRef.current) try { previewSourceRef.current.stop(); } catch (e) {}
    setPreviewingVoice(voiceName);

    try {
      if (voiceName === 'Custom' && customVoice) {
        const audio = new Audio(customVoice.url);
        audio.onended = () => setPreviewingVoice(null);
        audio.play().catch(() => setPreviewingVoice(null));
        return;
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: "Hello, I am Nova. I'm here to support your clarity." }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = outputAudioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => { if (previewingVoice === voiceName) setPreviewingVoice(null); };
        source.start();
        previewSourceRef.current = source;
      }
    } catch (err) {
      setPreviewingVoice(null);
    }
  };

  const handleFocusToggle = (focus: string) => {
    const current = userProfile.stressFocus || [];
    const updated = current.includes(focus) ? current.filter(f => f !== focus) : [...current, focus];
    setUserProfile({ ...userProfile, stressFocus: updated });
  };

  const toggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Browser not supported."); return; }
    if (!recognitionRef.current) {
      const r = new SpeechRecognition();
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
        }
        if (final) setTextInput(prev => (prev.endsWith(' ') || prev === '' ? prev : prev + ' ') + final);
      };
      r.onend = () => setIsDictating(false);
      recognitionRef.current = r;
    }
    if (isDictating) { recognitionRef.current.stop(); setIsDictating(false); }
    else { recognitionRef.current.start(); setIsDictating(true); setError(null); }
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    setIsActive(false); setIsListening(false); setTranscription('');
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
    sourcesRef.current.clear();
  }, []);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || isTyping || !hasCompletedTriage) return;
    if (isDictating) { recognitionRef.current?.stop(); setIsDictating(false); }
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textInput, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = textInput;
    setTextInput('');
    await sendToModel(currentInput);
  };

  const startVoiceSession = async () => {
    if (!hasCompletedTriage) { setError("Please complete the triage check first."); return; }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const voiceToUse = selectedVoice === 'Custom' ? 'Kore' : selectedVoice;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceToUse } } },
          systemInstruction: getSystemInstruction(),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true); setIsListening(true); setError(null);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.outputTranscription) setTranscription(prev => prev + m.serverContent?.outputTranscription?.text);
            if (m.serverContent?.turnComplete) setTranscription('');
            const b64 = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (b64 && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(b64), ctx, 24000, 1);
              const s = ctx.createBufferSource();
              s.buffer = audioBuffer;
              s.connect(ctx.destination);
              s.onended = () => sourcesRef.current.delete(s);
              s.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(s);
            }
          },
          onerror: () => { setError('Voice connection error.'); stopSession(); },
          onclose: () => stopSession()
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setError('Microphone access denied.'); }
  };

  const renderProfileFields = (isSettings = false) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Age Range (Optional)</label>
        <div className="grid grid-cols-2 gap-2">
          {AGE_RANGES.map(a => (
            <button
              key={a}
              onClick={() => setUserProfile({ ...userProfile, ageRange: a })}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${userProfile.ageRange === a ? 'bg-[var(--primary)] text-slate-900 border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Primary Role</label>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setUserProfile({ ...userProfile, primaryRole: r, educationLevel: '', workType: '', careRole: '', stressFocus: [] })}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${userProfile.primaryRole === r ? 'bg-[var(--primary)] text-slate-900 border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {userProfile.primaryRole === 'Student' && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Education Level</label>
            <select
              value={userProfile.educationLevel}
              onChange={(e) => setUserProfile({ ...userProfile, educationLevel: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            >
              <option value="">Select Level</option>
              {STUDENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Stress Focus (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {STUDENT_STRESS.map(s => (
                <button
                  key={s}
                  onClick={() => handleFocusToggle(s)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${userProfile.stressFocus?.includes(s) ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]' : 'bg-white/5 border-white/10 text-slate-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {userProfile.primaryRole === 'Employed' && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Work Type</label>
            <select
              value={userProfile.workType}
              onChange={(e) => setUserProfile({ ...userProfile, workType: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            >
              <option value="">Select Type</option>
              {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Stress Focus (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {WORK_STRESS.map(s => (
                <button
                  key={s}
                  onClick={() => handleFocusToggle(s)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${userProfile.stressFocus?.includes(s) ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]' : 'bg-white/5 border-white/10 text-slate-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {userProfile.primaryRole === 'Caregiver' && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Care Role</label>
            <select
              value={userProfile.careRole}
              onChange={(e) => setUserProfile({ ...userProfile, careRole: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            >
              <option value="">Select Role</option>
              {CARE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Main Challenges (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {CARE_CHALLENGES.map(c => (
                <button
                  key={c}
                  onClick={() => handleFocusToggle(c)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${userProfile.stressFocus?.includes(c) ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]' : 'bg-white/5 border-white/10 text-slate-500'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Additional Context</label>
        <textarea
          value={userProfile.additionalContext || ''}
          onChange={(e) => setUserProfile({ ...userProfile, additionalContext: e.target.value })}
          placeholder="Anything else you'd like me to know?"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white h-24 resize-none outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </div>

      {!isSettings && (
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <button onClick={() => finalizeProfileSetup()} className="text-slate-500 hover:text-white transition-colors text-sm font-semibold">Skip for now</button>
          <button
            onClick={() => finalizeProfileSetup()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--primary)] text-slate-900 font-bold transition-all shadow-lg hover:scale-105"
          >
            Continue <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center px-4">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Nova Care Space</h2>
        <p className="text-slate-400 max-w-lg mx-auto">Psychological first-aid. Grounding support during distress.</p>
      </div>

      <div className="w-full glass-panel rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden h-[75vh] relative shadow-2xl">
        {/* Profile Setup Overlay */}
        {showProfileSetup && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-slate-800/50 border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-y-auto max-h-[90%] custom-scrollbar">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Personalize Your Experience</h3>
                <p className="text-slate-400 text-sm leading-relaxed px-4">
                  To help Nova give more relevant support, you can set up a basic profile. You can skip anything and change it later in Settings.
                </p>
              </div>
              {renderProfileFields()}
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`absolute top-4 right-4 z-30 p-2 transition-all rounded-full border shadow-sm ${showSettings ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-slate-400 hover:text-white border-white/10'}`}
        >
          <Settings2 size={20} />
        </button>

        {showSettings && (
          <div className="absolute top-16 right-4 z-20 w-80 glass-panel border border-white/10 shadow-2xl rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200 overflow-y-auto max-h-[80%] custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-[var(--primary)]" /> Settings
              </h4>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400"><X size={16}/></button>
            </div>
            
            <div className="space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your Profile</h5>
                  <button 
                    onClick={() => { setUserProfile({ hasCompletedSetup: false }); setShowSettings(false); setShowProfileSetup(true); }}
                    className="text-[10px] text-[var(--primary)] font-bold hover:underline"
                  >
                    Reset Profile
                  </button>
                </div>
                {renderProfileFields(true)}
              </section>

              <section className="pt-6 border-t border-white/10">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Voice Options</h5>
                <div className="space-y-2">
                  {PREBUILT_VOICES.map(v => (
                    <div key={v} className="flex gap-2">
                      <button 
                        onClick={() => setSelectedVoice(v)}
                        className={`flex-grow text-xs px-3 py-2 rounded-xl border transition-all text-left ${selectedVoice === v ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                        {v}
                      </button>
                      <button onClick={() => playVoiceSample(v)} className={`p-2 rounded-xl border transition-all ${previewingVoice === v ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        {previewingVoice === v ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        <div className="bg-white/5 border-b border-white/10 p-4">
          <SessionControls isActive={isActive} isListening={isListening} onStartVoice={startVoiceSession} onStop={stopSession} onShowCrisis={() => setShowCrisis(true)} />
          {error && <div className="mt-2 p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-xs flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
        </div>

        <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white/10 text-slate-400' : 'bg-white/5 text-white'}`} style={{ color: msg.role === 'model' ? 'var(--primary)' : '' }}>
                  {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className={`p-4 rounded-3xl ${msg.role === 'user' ? 'bg-white text-slate-900 rounded-tr-none' : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none shadow-sm'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.id === 'welcome' && !hasCompletedTriage && (
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {[
                          { l: 1, t: "Manageable discomfort" },
                          { l: 2, t: "Heavy & persistent" },
                          { l: 3, t: "Overwhelming pressure" }
                        ].map(s => (
                          <button key={s.l} onClick={() => handleTriageResponse(s.l as IntensityStage)} className="flex items-center justify-between p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-xs font-bold text-white group">
                            Stage {s.l}: {s.t} <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                          </button>
                        ))}
                        <button onClick={() => { setIntensity(4); setHasCompletedTriage(true); setShowCrisis(true); }} className="flex items-center justify-between p-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all text-xs font-bold">
                          Stage 4: Critical distress (Escalate) <ShieldAlert size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {isActive && (
            <div className="flex justify-start animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center" style={{ color: 'var(--primary)' }}><Sparkles size={20} /></div>
                <div className="p-4 rounded-3xl bg-white/5 text-slate-300 border border-white/5 rounded-tl-none italic text-sm">
                  {transcription || "Nova is stabilizing..."}
                </div>
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center" style={{ color: 'var(--primary)' }}><Loader2 size={20} className="animate-spin" /></div>
                <div className="bg-white/5 px-5 py-3 rounded-3xl text-slate-500 text-sm italic border border-white/5">Reflecting...</div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendText} className="p-6 bg-transparent border-t border-white/5 flex items-end gap-3">
          <div className="flex-grow relative">
            <textarea
              rows={1}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              placeholder={!hasCompletedTriage ? "Please assess intensity above..." : isDictating ? "Listening..." : "Share what's on your mind..."}
              disabled={isActive || !hasCompletedTriage}
              className={`w-full bg-white/5 border ${isDictating ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-white/10'} rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all resize-none text-white disabled:opacity-50`}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={toggleDictation} disabled={isActive || isTyping || !hasCompletedTriage} className={`p-4 rounded-2xl transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
              {isDictating ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button type="submit" disabled={!textInput.trim() || isTyping || isActive || !hasCompletedTriage} className="p-4 rounded-2xl transition-all shadow-lg disabled:opacity-20" style={{ backgroundColor: 'var(--primary)', color: '#000' }}>
              <Send size={24} />
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex items-center gap-6 text-slate-500 text-xs">
         <span className="flex items-center gap-1 font-bold"><Info size={14} /> Stage 1-3 Support Only</span>
         <span className="flex items-center gap-1 font-bold"><ShieldAlert size={14} /> Emergency escalation at Stage 4+</span>
      </div>
      <CrisisModal isOpen={showCrisis} onClose={() => setShowCrisis(false)} />
    </div>
  );
};
