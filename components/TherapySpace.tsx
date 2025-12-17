
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Send, User, Sparkles, Loader2, Mic, MicOff, Settings2, Upload, Volume2, CheckCircle2, AlertCircle, Play, Square } from 'lucide-react';
import { decode, encode, decodeAudioData, createPcmBlob } from '../utils/audio';
import { SessionControls } from './SessionControls';
import { CrisisModal } from './CrisisModal';
import { Message } from '../types';

const THERAPIST_INSTRUCTION = `You are NOVA CARE AI, a psychology-focused AI designed exclusively for mental health support, emotional well-being, and self-reflection. You are NOT a replacement for a licensed psychologist, psychiatrist, or therapist.

CORE ROLE:
- Act as a calm, empathetic, non-judgmental psychological support companion.
- Provide emotional validation, reflective listening, and evidence-informed coping guidance.
- Support users experiencing stress, anxiety, sadness, loneliness, burnout, confusion, academic pressure, relationship strain, and emotional overwhelm.

BOUNDARIES & SAFETY (NON-NEGOTIABLE):
- NEVER diagnose mental health conditions.
- NEVER prescribe medication or medical treatment.
- NEVER present yourself as a licensed professional.
- DO NOT create emotional dependency.
- Encourage professional or emergency help when risk is detected.

THERAPEUTIC COMMUNICATION STYLE:
- Lead with empathy before solutions.
- Use reflective statements (e.g., “It sounds like…”, “What I’m hearing is…”).
- Ask open-ended, non-invasive questions.
- Normalize emotions without validating harmful behavior.
- Maintain a calm, grounded, reassuring tone at all times.

THERAPEUTIC TECHNIQUES (ALLOWED):
- Cognitive reframing (CBT-style, non-clinical)
- Grounding exercises (breathing, body awareness, present-moment focus)
- Emotional labeling and validation
- Thought clarification and journaling prompts
- Values clarification and gentle perspective shifts
- Stress regulation techniques

CRISIS & HIGH-RISK DETECTION:
If user expresses suicidal thoughts, self-harm intent, or severe distress:
1. Respond with empathy and seriousness.
2. Avoid advice-heavy responses.
3. Encourage contacting local emergency services or a mental health professional.
4. Suggest reaching out to a trusted person.
5. State clearly that immediate human support is important.

RESPONSE STRUCTURE:
- Short to medium-length responses.
- Clear paragraphing.
- No excessive lists unless grounding or exercises are provided.
- Never overwhelm the user.

FINAL PRINCIPLE: You exist to help users feel understood, grounded, and supported—not fixed, diagnosed, or controlled.`;

const PREBUILT_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const TherapySpace: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [showCrisis, setShowCrisis] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [customVoice, setCustomVoice] = useState<{ name: string; url: string } | null>(null);
  const [voiceNameInput, setVoiceNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello, I'm Nova. I'm here to listen, understand, and support you. How are you feeling in this moment?",
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, transcription]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
          setTextInput(prev => (prev.endsWith(' ') || prev === '' ? prev : prev + ' ') + finalTranscript);
        }
      };
      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const playVoiceSample = async (voiceName: string) => {
    if (previewingVoice === voiceName) {
      if (previewSourceRef.current) {
        previewSourceRef.current.stop();
        previewSourceRef.current = null;
      }
      setPreviewingVoice(null);
      return;
    }

    // Stop any existing preview
    if (previewSourceRef.current) {
      previewSourceRef.current.stop();
    }

    setPreviewingVoice(voiceName);

    try {
      if (voiceName === 'Custom' && customVoice) {
        const audio = new Audio(customVoice.url);
        audio.onended = () => setPreviewingVoice(null);
        audio.play();
        return;
      }

      // Generate sample for pre-built voice
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: "Hello, I am Nova Care AI. I am here to support you." }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!outputAudioContextRef.current) {
          outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = outputAudioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          if (previewingVoice === voiceName) setPreviewingVoice(null);
        };
        source.start();
        previewSourceRef.current = source;
      }
    } catch (err) {
      console.error("Failed to play sample", err);
      setPreviewingVoice(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError("Please upload a valid audio file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Please upload an audio sample under 5MB.");
      return;
    }

    setError(null);
    setVoiceStatus("Cloning your custom voice...");
    
    setTimeout(() => {
      const url = URL.createObjectURL(file);
      const name = voiceNameInput.trim() || file.name.split('.')[0] || "Custom Voice";
      setCustomVoice({ name, url });
      setSelectedVoice('Custom');
      setVoiceStatus(`'${name}' profile active. Nova is ready.`);
      setVoiceNameInput(''); // Clear input after successful upload
      setTimeout(() => setVoiceStatus(null), 3000);
    }, 1500);
  };

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    if (isDictating) {
      recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsDictating(true);
        setError(null);
      } catch (e) {
        setIsDictating(false);
      }
    }
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setIsListening(false);
    setTranscription('');
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e){} });
    sourcesRef.current.clear();
  }, []);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || isTyping) return;
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textInput, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = textInput;
    setTextInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (!textChatRef.current) {
        textChatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: { systemInstruction: THERAPIST_INSTRUCTION }
        });
      }
      const response = await textChatRef.current.sendMessage({ message: currentInput });
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: response.text || "I'm listening.", timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      setError('Connection issue. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const startVoiceSession = async () => {
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
          systemInstruction: THERAPIST_INSTRUCTION,
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
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) setTranscription(prev => prev + message.serverContent?.outputTranscription?.text);
            if (message.serverContent?.turnComplete) setTranscription('');
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => { setError('Voice connection error.'); stopSession(); },
          onclose: () => stopSession()
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setError('Microphone access denied.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center px-4">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Nova Care Space</h2>
        <p className="text-slate-400 max-w-lg mx-auto">Your dedicated psychological companion. We are here to listen and ground you.</p>
      </div>

      <div className="w-full glass-panel rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden h-[75vh] relative shadow-2xl">
        {/* Settings Button */}
        <button 
          onClick={() => setShowVoiceSettings(!showVoiceSettings)}
          className={`absolute top-4 right-4 z-30 p-2 transition-all rounded-full border shadow-sm ${showVoiceSettings ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-slate-400 hover:text-white border-white/10'}`}
          title="Voice Personalization"
        >
          <Settings2 size={20} />
        </button>

        {/* Voice Settings Dropdown */}
        {showVoiceSettings && (
          <div className="absolute top-16 right-4 z-20 w-80 glass-panel border border-white/10 shadow-2xl rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Volume2 size={16} style={{ color: 'var(--primary)' }} /> Voice Personalization
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Active Profile</label>
                <div className="grid grid-cols-1 gap-2">
                  {PREBUILT_VOICES.map(v => (
                    <div key={v} className="flex gap-2">
                      <button 
                        onClick={() => setSelectedVoice(v)}
                        className={`flex-grow text-xs px-3 py-2.5 rounded-xl border font-medium transition-all text-left ${selectedVoice === v ? 'bg-white/10 border-white/50 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                        {v}
                      </button>
                      <button 
                        onClick={() => playVoiceSample(v)}
                        className={`p-2.5 rounded-xl border transition-all ${previewingVoice === v ? 'bg-white text-slate-900 border-white animate-pulse' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                        title="Play Sample"
                      >
                        {previewingVoice === v ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      </button>
                    </div>
                  ))}
                  {customVoice && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedVoice('Custom')}
                        className={`flex-grow text-xs px-3 py-2.5 rounded-xl border font-medium transition-all flex items-center gap-2 text-left ${selectedVoice === 'Custom' ? 'bg-white/10 border-white/50 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                        <Sparkles size={12} /> {customVoice.name.slice(0, 15)}{customVoice.name.length > 15 ? '..' : ''}
                      </button>
                      <button 
                        onClick={() => playVoiceSample('Custom')}
                        className={`p-2.5 rounded-xl border transition-all ${previewingVoice === 'Custom' ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                        title="Play Sample"
                      >
                        {previewingVoice === 'Custom' ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Profile Name</label>
                  <input 
                    type="text" 
                    value={voiceNameInput}
                    onChange={(e) => setVoiceNameInput(e.target.value)}
                    placeholder="e.g. My Friend"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold py-3 bg-white text-slate-900 rounded-xl hover:bg-slate-200 transition-all shadow-lg"
                >
                  <Upload size={14} /> Import Custom Voice
                </button>
                
                {voiceStatus && (
                  <div className="mt-3 p-2 bg-white/5 text-white text-[10px] rounded-lg border border-white/10 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <CheckCircle2 size={12} className="flex-shrink-0" /> {voiceStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 border-b border-white/10 p-4">
          <SessionControls isActive={isActive} isListening={isListening} onStartVoice={startVoiceSession} onStop={stopSession} onShowCrisis={() => setShowCrisis(true)} />
          {error && (
            <div className="mt-2 p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span className="font-bold">Notice:</span> {error}
              <button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button>
            </div>
          )}
        </div>

        <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white/10 text-slate-400' : 'bg-white/5 text-white'}`} style={{ color: msg.role === 'model' ? 'var(--primary)' : '' }}>
                  {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
                </div>
                <div className={`p-4 rounded-3xl ${msg.role === 'user' ? 'bg-white text-slate-900 rounded-tr-none' : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none shadow-sm'}`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span className={`text-[10px] block mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {isActive && (
            <div className="flex justify-start animate-pulse">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center" style={{ color: 'var(--primary)' }}>
                  <Sparkles size={20} />
                </div>
                <div className="p-4 rounded-3xl bg-white/5 text-slate-300 border border-white/5 rounded-tl-none italic">
                  {transcription || "Nova is listening carefully..."}
                </div>
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center" style={{ color: 'var(--primary)' }}>
                  <Loader2 size={20} className="animate-spin" />
                </div>
                <div className="bg-white/5 px-5 py-3 rounded-3xl text-slate-500 text-sm italic border border-white/5">
                  Nova is reflecting...
                </div>
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
              placeholder={isDictating ? "Listening..." : "Share what's on your mind..."}
              className={`w-full bg-white/5 border ${isDictating ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-white/10'} rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all resize-none text-white pr-12`}
              disabled={isActive}
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={toggleDictation} 
              disabled={isActive || isTyping} 
              className={`p-4 rounded-2xl transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white'}`}
            >
              {isDictating ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button 
              type="submit" 
              disabled={!textInput.trim() || isTyping || isActive} 
              className="p-4 rounded-2xl transition-all shadow-lg disabled:opacity-20"
              style={{ backgroundColor: 'var(--primary)', color: '#000' }}
            >
              <Send size={24} />
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center text-slate-500 text-sm flex items-center gap-2">
         NOVA CARE AI is an empathetic companion, not a replacement for professional clinical therapy.
      </div>
      <CrisisModal isOpen={showCrisis} onClose={() => setShowCrisis(false)} />
    </div>
  );
};
