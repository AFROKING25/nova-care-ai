
export enum SessionType {
  VOICE = 'VOICE',
  TEXT = 'TEXT'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface JournalEntry {
  id: string;
  date: Date;
  mood: string;
  note: string;
}

export interface VoiceSessionState {
  isActive: boolean;
  isListening: boolean;
  transcription: string;
}
