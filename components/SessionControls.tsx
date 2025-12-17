
import React from 'react';
import { Mic, PhoneOff, AlertCircle, Radio } from 'lucide-react';

interface SessionControlsProps {
  isActive: boolean;
  isListening: boolean;
  onStartVoice: () => void;
  onStop: () => void;
  onShowCrisis: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  isActive,
  isListening,
  onStartVoice,
  onStop,
  onShowCrisis,
}) => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        {!isActive ? (
          <button
            onClick={onStartVoice}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all transform hover:scale-105 shadow-md shadow-emerald-200"
          >
            <Mic size={20} />
            Voice Session
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Live Call</span>
            </div>
            <button
              onClick={onStop}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md"
            >
              <PhoneOff size={20} />
              End Call
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onShowCrisis}
        className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-all font-medium text-sm"
      >
        <AlertCircle size={18} />
        Crisis Help
      </button>
    </div>
  );
};
