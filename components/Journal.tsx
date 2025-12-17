
import React, { useState, useMemo } from 'react';
import { Book, Save, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { JournalEntry } from '../types';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const moodToValue: Record<string, number> = {
  '😊': 5,
  '😐': 3,
  '😔': 2,
  '😫': 1,
  '😡': 1,
  '😴': 2,
};

export const Journal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('nova_journal');
    return saved ? JSON.parse(saved).map((e: any) => ({ ...e, date: new Date(e.date) })) : [];
  });
  const [newNote, setNewNote] = useState('');
  const [mood, setMood] = useState('😊');

  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(entry => ({
        date: entry.date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: moodToValue[entry.mood] || 3,
        mood: entry.mood,
        timestamp: entry.date.getTime()
      }));
  }, [entries]);

  const saveEntry = () => {
    if (!newNote.trim()) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date(),
      mood,
      note: newNote,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    localStorage.setItem('nova_journal', JSON.stringify(updated));
    setNewNote('');
  };

  const deleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem('nova_journal', JSON.stringify(updated));
  };

  // Get current primary color from CSS variable for chart
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#22d3ee';

  return (
    <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
      <div className="mb-12">
        <h2 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Book style={{ color: 'var(--primary)' }} /> Reflection Journal
        </h2>
        <p className="text-slate-400">Writing down your thoughts can help clarify your feelings and reduce stress.</p>
      </div>

      {entries.length > 1 && (
        <div className="glass-panel rounded-3xl p-8 border border-white/10 mb-12 animate-in fade-in duration-500 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-sm">Your Mood Journey</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <YAxis hide domain={[0, 6]} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 p-3 rounded-xl shadow-2xl border border-white/10">
                          <p className="text-xs text-slate-500 font-semibold mb-1">{payload[0].payload.date}</p>
                          <p className="text-2xl">{payload[0].payload.mood}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={primaryColor} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMood)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-3xl p-8 border border-white/10 mb-12 shadow-2xl">
        <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">How are you feeling right now?</label>
        <div className="flex gap-4 mb-6">
          {['😊', '😐', '😔', '😫', '😡', '😴'].map(m => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`text-2xl p-3 rounded-xl transition-all ${mood === m ? 'bg-white/10 ring-2 ring-[var(--primary)] transform scale-110' : 'bg-white/5 hover:bg-white/10'}`}
            >
              {m}
            </button>
          ))}
        </div>
        
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="What's on your mind? Don't worry about grammar, just let it flow..."
          className="w-full h-40 p-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all resize-none mb-6 text-white"
        />

        <button
          onClick={saveEntry}
          className="flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all ml-auto shadow-lg"
          style={{ backgroundColor: 'var(--primary)', color: '#000' }}
        >
          <Save size={20} /> Save Entry
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white mb-4">Past Reflections</h3>
        {entries.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 text-slate-500">
            No entries yet. Start your journey by writing your first reflection above.
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="glass-panel p-6 rounded-2xl border border-white/10 group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl bg-white/5 w-12 h-12 flex items-center justify-center rounded-xl">{entry.mood}</span>
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Calendar size={14} />
                      {entry.date.toLocaleDateString()} at {entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{entry.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
