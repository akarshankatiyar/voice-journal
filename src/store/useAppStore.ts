import { create } from 'zustand';

interface AppState {
  isRecording: boolean;
  liveTranscript: string;
  interimText: string;
  sidebarOpen: boolean;
  setRecording: (val: boolean) => void;
  appendTranscript: (text: string) => void;
  setInterimText: (text: string) => void;
  clearTranscript: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isRecording: false,
  liveTranscript: '',
  interimText: '',
  sidebarOpen: true,
  setRecording: (val) => set({ isRecording: val }),
  appendTranscript: (text) => set((s) => ({ liveTranscript: s.liveTranscript + ' ' + text })),
  setInterimText: (text) => set({ interimText: text }),
  clearTranscript: () => set({ liveTranscript: '', interimText: '' }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
}));
