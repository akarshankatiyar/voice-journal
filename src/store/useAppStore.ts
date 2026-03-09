import { create } from 'zustand';

interface AppState {
  isRecording: boolean;
  captureMode: 'mic' | 'device' | null;
  liveTranscript: string;
  interimText: string;
  sidebarOpen: boolean;
  setRecording: (val: boolean) => void;
  setCaptureMode: (mode: 'mic' | 'device' | null) => void;
  appendTranscript: (text: string) => void;
  setInterimText: (text: string) => void;
  clearTranscript: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isRecording: false,
  captureMode: null,
  liveTranscript: '',
  interimText: '',
  sidebarOpen: true,
  setRecording: (val) => set({ isRecording: val }),
  setCaptureMode: (mode) => set({ captureMode: mode }),
  appendTranscript: (text) => set((s) => ({ liveTranscript: s.liveTranscript + ' ' + text })),
  setInterimText: (text) => set({ interimText: text }),
  clearTranscript: () => set({ liveTranscript: '', interimText: '' }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
}));
