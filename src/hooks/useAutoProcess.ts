import { useCallback } from 'react';
import { useConversationStore } from '@/store/useConversationStore';
import { useAIProcessing } from '@/hooks/useAIProcessing';
import { processTranscript } from '@/services/aiService';
import { toast } from 'sonner';

export function useAutoProcess() {
  const { addConversation, addAcademicNote, addMeetingNote, addTasks, addIdeas } = useConversationStore();
  const { processConversation } = useAIProcessing();

  const processAndSave = useCallback(async (transcript: string) => {
    if (!transcript || transcript.trim().length < 10) return;

    toast.info('🧠 Processing your recording...');

    try {
      const result = await processConversation(transcript);
      if (!result) return;

      const { classification, summary } = result;
      const now = new Date().toISOString();
      const convId = `conv_${Date.now()}`;

      // Save conversation to Today's Text
      const conversation = {
        id: convId,
        userId: 'user1',
        title: classification.title || 'Untitled Recording',
        fullTranscript: classification.corrected_transcript || transcript,
        summary: summary.summary,
        type: classification.type,
        subTypes: classification.sub_types || [],
        peopleMentioned: classification.people_mentioned || [],
        tags: classification.sub_types || [],
        linkedSection: classification.type === 'academic' ? 'academic_notes' : classification.type === 'meeting' ? 'meeting_notes' : null,
        images: [],
        isLive: false,
        startedAt: now,
        endedAt: now,
        createdAt: now,
      };
      addConversation(conversation);

      // Generate and save dedicated section notes
      if (classification.type === 'academic') {
        try {
          const notes = await processTranscript(classification.corrected_transcript || transcript, 'academic_notes');
          if (notes && !notes.parse_error) {
            addAcademicNote({
              id: `an_${Date.now()}`,
              conversationId: convId,
              title: notes.title || classification.title,
              subject: notes.subject || 'General',
              structuredNotes: notes.structured_notes || '',
              keyConcepts: notes.key_concepts || [],
              summary: notes.summary || summary.summary,
              createdAt: now,
            });
          }
        } catch (e) { console.error('Academic notes error:', e); }
      } else if (classification.type === 'meeting') {
        try {
          const notes = await processTranscript(classification.corrected_transcript || transcript, 'meeting_notes');
          if (notes && !notes.parse_error) {
            addMeetingNote({
              id: `mn_${Date.now()}`,
              conversationId: convId,
              title: notes.title || classification.title,
              attendees: notes.attendees || [],
              agenda: notes.agenda || '',
              actionItems: (notes.action_items || []).map((a: any) => typeof a === 'string' ? a : a.task),
              decisions: notes.decisions || [],
              structuredNotes: notes.structured_notes || '',
              summary: notes.summary || summary.summary,
              createdAt: now,
            });
          }
        } catch (e) { console.error('Meeting notes error:', e); }
      }

      // Extract tasks
      if (classification.sub_types?.includes('task') || summary.action_items?.length > 0) {
        try {
          const taskResult = await processTranscript(classification.corrected_transcript || transcript, 'extract_tasks');
          if (Array.isArray(taskResult) && taskResult.length > 0) {
            const newTasks = taskResult.map((t: any, i: number) => ({
              id: `t_${Date.now()}_${i}`,
              conversationId: convId,
              taskText: t.task,
              dueHint: t.due_hint || 'no date',
              isDone: false,
              createdAt: now,
            }));
            addTasks(newTasks);
          }
        } catch (e) { console.error('Task extraction error:', e); }
      }

      // Extract ideas
      if (classification.sub_types?.includes('idea')) {
        try {
          const ideaResult = await processTranscript(classification.corrected_transcript || transcript, 'extract_ideas');
          if (Array.isArray(ideaResult) && ideaResult.length > 0) {
            const newIdeas = ideaResult.map((idea: any, i: number) => ({
              id: `i_${Date.now()}_${i}`,
              conversationId: convId,
              ideaText: idea.idea,
              category: idea.category || 'other',
              createdAt: now,
            }));
            addIdeas(newIdeas);
          }
        } catch (e) { console.error('Idea extraction error:', e); }
      }

      toast.success(`✅ Saved as ${classification.type} — "${classification.title}"`);
    } catch (err: any) {
      console.error('Auto-process error:', err);
      toast.error('Failed to process recording. Transcript saved.');
    }
  }, [processConversation, addConversation, addAcademicNote, addMeetingNote, addTasks, addIdeas]);

  return { processAndSave };
}
