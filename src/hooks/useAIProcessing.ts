import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  classifyTranscript,
  summarizeTranscript,
  generateAcademicNotes,
  generateMeetingNotes,
  getDailySummary,
  type ClassificationResult,
  type SummaryResult,
  type AcademicNotesResult,
  type MeetingNotesResult,
  type DailySummaryResult,
} from '@/services/aiService';
import { toast } from 'sonner';

export function useAIProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [academicNotes, setAcademicNotes] = useState<AcademicNotesResult | null>(null);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNotesResult | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummaryResult | null>(null);

  const processConversation = useCallback(async (transcript: string) => {
    if (!transcript || transcript.trim().length < 10) {
      toast.error('Transcript too short to process');
      return null;
    }

    setIsProcessing(true);
    try {
      // Step 1: Classify
      toast.info('🧠 AI is analyzing your conversation...');
      const classResult = await classifyTranscript(transcript);
      setClassification(classResult);

      // Use corrected transcript if available
      const correctedText = classResult.corrected_transcript || transcript;

      // Step 2: Summarize
      const sumResult = await summarizeTranscript(correctedText);
      setSummary(sumResult);

      // Step 3: Generate structured notes based on type
      if (classResult.type === 'academic') {
        toast.info('📚 Generating academic notes...');
        const notes = await generateAcademicNotes(correctedText);
        setAcademicNotes(notes);
      } else if (classResult.type === 'meeting') {
        toast.info('🤝 Generating meeting notes...');
        const notes = await generateMeetingNotes(correctedText);
        setMeetingNotes(notes);
      }

      toast.success(`✅ Classified as ${classResult.type} — "${classResult.title}"`);
      return { classification: classResult, summary: sumResult };
    } catch (err: any) {
      console.error('AI processing error:', err);
      toast.error(err.message || 'AI processing failed. Your transcript is saved.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const fetchDailySummary = useCallback(async (dayData: string) => {
    try {
      const result = await getDailySummary(dayData);
      setDailySummary(result);
      return result;
    } catch (err) {
      console.error('Daily summary error:', err);
      return null;
    }
  }, []);

  return {
    isProcessing,
    classification,
    summary,
    academicNotes,
    meetingNotes,
    dailySummary,
    processConversation,
    fetchDailySummary,
  };
}
