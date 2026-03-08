import { Timestamp } from './types';

// Simple timestamp helper
const ts = (hoursAgo: number = 0): string => {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
};

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  fullTranscript: string;
  summary: string;
  type: 'personal' | 'academic' | 'meeting' | 'mixed';
  subTypes: string[];
  peopleMentioned: string[];
  tags: string[];
  linkedSection: string | null;
  images: string[];
  isLive: boolean;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface AcademicNote {
  id: string;
  conversationId: string;
  title: string;
  subject: string;
  structuredNotes: string;
  keyConcepts: string[];
  summary: string;
  createdAt: string;
  source?: 'voice' | 'youtube';
  videoId?: string;
  hasTranscript?: boolean;
  language?: 'english' | 'hindi' | 'hinglish';
}

export interface MeetingNote {
  id: string;
  conversationId: string;
  title: string;
  attendees: string[];
  agenda: string;
  actionItems: string[];
  decisions: string[];
  structuredNotes: string;
  summary: string;
  createdAt: string;
}

export interface Task {
  id: string;
  conversationId: string;
  taskText: string;
  dueHint: string;
  isDone: boolean;
  createdAt: string;
}

export interface Idea {
  id: string;
  conversationId: string;
  ideaText: string;
  category: string;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  relationship: string;
  lastTalked: string;
  conversationIds: string[];
  notes: string;
  createdAt: string;
}

export interface HealthLog {
  id: string;
  conversationId: string;
  healthText: string;
  category: 'symptom' | 'medicine' | 'appointment' | 'general';
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  conversationId: string;
  itemText: string;
  isBought: boolean;
  createdAt: string;
}

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    userId: 'user1',
    title: 'Physics Lecture — Thermodynamics',
    fullTranscript: 'Today we covered the laws of thermodynamics. The first law states that energy cannot be created or destroyed, only transferred. The second law introduces entropy — in any natural process, the total entropy of a system always increases. We discussed heat engines and Carnot cycles...',
    summary: 'Covered the three laws of thermodynamics with focus on entropy and heat engines. Key formulas for Carnot efficiency were derived.',
    type: 'academic',
    subTypes: ['task'],
    peopleMentioned: ['Prof. Sharma'],
    tags: ['physics', 'thermodynamics'],
    linkedSection: 'academic_notes',
    images: [],
    isLive: false,
    startedAt: ts(3),
    endedAt: ts(2),
    createdAt: ts(3),
  },
  {
    id: 'conv2',
    userId: 'user1',
    title: 'Startup Pitch Review',
    fullTranscript: 'Rahul presented the Q1 roadmap. Priya suggested we focus on the MVP launch in March. We discussed the investor deck — needs more market data. Action item: Rahul to send updated deck by Friday. Decision: Launch MVP by end of March.',
    summary: 'Reviewed Q1 roadmap and investor deck. Agreed on March MVP launch. Rahul to update and send deck by Friday.',
    type: 'meeting',
    subTypes: ['task', 'idea'],
    peopleMentioned: ['Rahul', 'Priya'],
    tags: ['startup', 'pitch'],
    linkedSection: 'meeting_notes',
    images: [],
    isLive: false,
    startedAt: ts(5),
    endedAt: ts(4),
    createdAt: ts(5),
  },
  {
    id: 'conv3',
    userId: 'user1',
    title: 'Talk with Mom',
    fullTranscript: 'Mom called to check in. She mentioned her health checkup is next week. Dad is feeling better after the cold. She reminded me to buy groceries — milk, bread, and eggs. Also asked about Diwali plans.',
    summary: 'Catch-up call with Mom. Dad recovering from cold. Mom has a health checkup next week. Reminded to buy groceries.',
    type: 'personal',
    subTypes: ['health', 'shopping', 'people'],
    peopleMentioned: ['Mom', 'Dad'],
    tags: ['family'],
    linkedSection: null,
    images: [],
    isLive: false,
    startedAt: ts(1),
    endedAt: ts(0.5),
    createdAt: ts(1),
  },
  {
    id: 'conv4',
    userId: 'user1',
    title: 'Evening Brainstorm Session',
    fullTranscript: 'What if we build an app that tracks daily expenses via voice? Just speak your spending and it categorizes automatically. Could use Gemini for classification. Also thought about a habit tracker that uses voice check-ins...',
    summary: 'Brainstormed two app ideas: voice-based expense tracker and voice-powered habit tracker.',
    type: 'personal',
    subTypes: ['idea'],
    peopleMentioned: [],
    tags: ['brainstorm', 'ideas'],
    linkedSection: null,
    images: [],
    isLive: false,
    startedAt: ts(7),
    endedAt: ts(6.5),
    createdAt: ts(7),
  },
];

export const mockAcademicNotes: AcademicNote[] = [
  {
    id: 'an1',
    conversationId: 'conv1',
    title: 'Physics Lecture — Thermodynamics',
    subject: 'Physics',
    structuredNotes: '## Laws of Thermodynamics\n\n### First Law\n- Energy cannot be created or destroyed\n- **ΔU = Q - W** (change in internal energy = heat added - work done)\n\n### Second Law\n- Entropy always increases in natural processes\n- **S ≥ 0** for irreversible processes\n\n### Carnot Cycle\n- Most efficient heat engine cycle\n- Efficiency: **η = 1 - T_cold/T_hot**\n- Consists of two isothermal and two adiabatic processes',
    keyConcepts: ['entropy', 'heat transfer', 'Carnot cycle', 'internal energy'],
    summary: 'Comprehensive lecture on thermodynamic laws with derivation of Carnot efficiency.',
    createdAt: ts(3),
  },
  {
    id: 'an2',
    conversationId: 'conv5',
    title: 'History — Indian Independence Movement',
    subject: 'History',
    structuredNotes: '## Indian Independence Movement\n\n### Key Events\n- 1857 Sepoy Mutiny\n- 1919 Jallianwala Bagh Massacre\n- 1930 Salt March\n- 1942 Quit India Movement\n\n### Important Figures\n- **Mahatma Gandhi** — Non-violence, Satyagraha\n- **Subhas Chandra Bose** — INA\n- **Jawaharlal Nehru** — First PM',
    keyConcepts: ['Satyagraha', 'Non-cooperation', 'Quit India', 'Salt March'],
    summary: 'Overview of the Indian independence movement from 1857 to 1947.',
    createdAt: ts(24),
  },
];

export const mockMeetingNotes: MeetingNote[] = [
  {
    id: 'mn1',
    conversationId: 'conv2',
    title: 'Startup Pitch Review',
    attendees: ['Rahul', 'Priya', 'You'],
    agenda: 'Review Q1 roadmap and investor deck',
    actionItems: ['Rahul to send updated deck by Friday', 'Priya to finalize MVP feature list', 'Schedule follow-up meeting next Tuesday'],
    decisions: ['Launch MVP by end of March', 'Focus on 3 core features only', 'Postpone Series A pitch to Q2'],
    structuredNotes: '## Q1 Roadmap Review\n\n- Current progress: 60% of planned features complete\n- Key blocker: Payment integration delayed\n- Rahul presented updated market research\n\n## Investor Deck\n- Needs more competitive analysis\n- Add TAM/SAM/SOM slides\n- Update financial projections',
    summary: 'Reviewed Q1 progress and agreed on March MVP launch with focus on 3 core features.',
    createdAt: ts(5),
  },
];

export const mockTasks: Task[] = [
  { id: 't1', conversationId: 'conv3', taskText: 'Buy groceries — milk, bread, and eggs', dueHint: 'today', isDone: false, createdAt: ts(1) },
  { id: 't2', conversationId: 'conv2', taskText: 'Review Rahul\'s updated deck', dueHint: 'Friday', isDone: false, createdAt: ts(5) },
  { id: 't3', conversationId: 'conv1', taskText: 'Complete thermodynamics practice problems', dueHint: 'this week', isDone: false, createdAt: ts(3) },
  { id: 't4', conversationId: 'conv2', taskText: 'Schedule follow-up meeting', dueHint: 'next Tuesday', isDone: true, createdAt: ts(5) },
];

export const mockIdeas: Idea[] = [
  { id: 'i1', conversationId: 'conv4', ideaText: 'App that tracks daily expenses via voice — speak your spending and it auto-categorizes', category: 'startup', createdAt: ts(7) },
  { id: 'i2', conversationId: 'conv4', ideaText: 'Voice-powered habit tracker with daily check-ins', category: 'startup', createdAt: ts(7) },
  { id: 'i3', conversationId: 'conv2', ideaText: 'Add voice onboarding to the MVP for better UX', category: 'startup', createdAt: ts(5) },
  { id: 'i4', conversationId: '', ideaText: 'Create a personal podcast from daily voice notes', category: 'creative', createdAt: ts(48) },
];

export const mockPeople: Person[] = [
  { id: 'p1', name: 'Mom', relationship: 'Family', lastTalked: ts(1), conversationIds: ['conv3'], notes: 'Health checkup next week. Asked about Diwali plans.', createdAt: ts(100) },
  { id: 'p2', name: 'Rahul', relationship: 'Co-founder', lastTalked: ts(5), conversationIds: ['conv2'], notes: 'Working on investor deck. Responsible for Q1 roadmap.', createdAt: ts(200) },
  { id: 'p3', name: 'Priya', relationship: 'Team Member', lastTalked: ts(5), conversationIds: ['conv2'], notes: 'Handling MVP feature list and product decisions.', createdAt: ts(200) },
  { id: 'p4', name: 'Prof. Sharma', relationship: 'Professor', lastTalked: ts(3), conversationIds: ['conv1'], notes: 'Physics professor. Thermodynamics specialist.', createdAt: ts(300) },
];

export const mockHealthLogs: HealthLog[] = [
  { id: 'h1', conversationId: 'conv3', healthText: 'Dad recovering from cold, feeling better', category: 'general', createdAt: ts(1) },
  { id: 'h2', conversationId: 'conv3', healthText: 'Mom\'s health checkup scheduled for next week', category: 'appointment', createdAt: ts(1) },
  { id: 'h3', conversationId: '', healthText: 'Feeling headache since morning, took paracetamol', category: 'symptom', createdAt: ts(24) },
  { id: 'h4', conversationId: '', healthText: 'Started vitamin D supplements as per doctor', category: 'medicine', createdAt: ts(48) },
];

export const mockShoppingItems: ShoppingItem[] = [
  { id: 's1', conversationId: 'conv3', itemText: 'Milk', isBought: false, createdAt: ts(1) },
  { id: 's2', conversationId: 'conv3', itemText: 'Bread', isBought: false, createdAt: ts(1) },
  { id: 's3', conversationId: 'conv3', itemText: 'Eggs', isBought: false, createdAt: ts(1) },
  { id: 's4', conversationId: '', itemText: 'Laundry detergent', isBought: true, createdAt: ts(24) },
  { id: 's5', conversationId: '', itemText: 'Notebook for physics', isBought: false, createdAt: ts(12) },
];
