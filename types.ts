
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

export type IntensityStage = 1 | 2 | 3 | 4;

export interface TherapySession {
  id: string;
  date: Date;
  messages: Message[];
  intensity: IntensityStage | null;
}

export interface UserProfile {
  ageRange?: string;
  primaryRole?: string;
  educationLevel?: string;
  workType?: string;
  careRole?: string;
  stressFocus?: string[];
  additionalContext?: string;
  hasCompletedSetup?: boolean;
}
