
import React from 'react';
import { X, ExternalLink, Phone } from 'lucide-react';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-red-600 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Phone /> Immediate Help
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <p className="text-slate-700 leading-relaxed font-medium">
            If you are in immediate danger or experiencing a life-threatening emergency, please contact your local emergency services (911 in the US) or go to the nearest hospital immediately.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">988 Suicide & Crisis Lifeline (USA)</h3>
              <p className="text-slate-600 text-sm mb-3">Call or text 988 anytime. Available 24/7 in English and Spanish.</p>
              <a href="https://988lifeline.org" target="_blank" className="text-red-600 font-semibold flex items-center gap-1 hover:underline">
                Visit 988 Website <ExternalLink size={14} />
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">Crisis Text Line</h3>
              <p className="text-slate-600 text-sm mb-3">Text HOME to 741741 to connect with a volunteer Crisis Counselor.</p>
              <a href="https://www.crisistextline.org" target="_blank" className="text-red-600 font-semibold flex items-center gap-1 hover:underline">
                Visit Website <ExternalLink size={14} />
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">International Resources</h3>
              <p className="text-slate-600 text-sm mb-3">Find local helplines globally through Befrienders Worldwide.</p>
              <a href="https://www.befrienders.org" target="_blank" className="text-red-600 font-semibold flex items-center gap-1 hover:underline">
                Find Local Help <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            I understand, back to Nova Care
          </button>
        </div>
      </div>
    </div>
  );
};
