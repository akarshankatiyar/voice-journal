import { create } from 'zustand';
import type { Conversation, AcademicNote, MeetingNote, Task, Idea } from '@/data/mockData';
import { mockConversations, mockAcademicNotes, mockMeetingNotes, mockTasks, mockIdeas } from '@/data/mockData';

interface ConversationStore {
  conversations: Conversation[];
  academicNotes: AcademicNote[];
  meetingNotes: MeetingNote[];
  tasks: Task[];
  ideas: Idea[];
  addConversation: (conv: Conversation) => void;
  addAcademicNote: (note: AcademicNote) => void;
  addMeetingNote: (note: MeetingNote) => void;
  addTasks: (tasks: Task[]) => void;
  addIdeas: (ideas: Idea[]) => void;
  toggleTask: (id: string) => void;
  deleteAcademicNote: (id: string) => void;
  deleteMeetingNote: (id: string) => void;
  deleteConversation: (id: string) => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [...mockConversations],
  academicNotes: [...mockAcademicNotes],
  meetingNotes: [...mockMeetingNotes],
  tasks: [...mockTasks],
  ideas: [...mockIdeas],

  addConversation: (conv) => set((s) => ({ conversations: [conv, ...s.conversations] })),
  addAcademicNote: (note) => set((s) => ({ academicNotes: [note, ...s.academicNotes] })),
  addMeetingNote: (note) => set((s) => ({ meetingNotes: [note, ...s.meetingNotes] })),
  addTasks: (newTasks) => set((s) => ({ tasks: [...newTasks, ...s.tasks] })),
  addIdeas: (newIdeas) => set((s) => ({ ideas: [...newIdeas, ...s.ideas] })),
  toggleTask: (id) => set((s) => ({
    tasks: s.tasks.map((t) => t.id === id ? { ...t, isDone: !t.isDone } : t),
  })),
  deleteAcademicNote: (id) => set((s) => ({
    academicNotes: s.academicNotes.filter((n) => n.id !== id),
  })),
  deleteMeetingNote: (id) => set((s) => ({
    meetingNotes: s.meetingNotes.filter((n) => n.id !== id),
  })),
  deleteConversation: (id) => set((s) => ({
    conversations: s.conversations.filter((c) => c.id !== id),
  })),
}));
