import { supabase } from "@/integrations/supabase/client";

export type AIAction = 
  | "classify" 
  | "summarize" 
  | "academic_notes" 
  | "meeting_notes" 
  | "extract_tasks" 
  | "extract_ideas" 
  | "daily_summary";

export async function processTranscript(transcript: string, action: AIAction) {
  const { data, error } = await supabase.functions.invoke("process-transcript", {
    body: { transcript, action },
  });

  if (error) {
    console.error("AI processing error:", error);
    throw new Error(error.message || "AI processing failed");
  }

  if (data?.parse_error) {
    console.warn("AI returned unparseable response:", data.raw);
  }

  return data;
}

export interface ClassificationResult {
  type: "personal" | "academic" | "meeting" | "mixed";
  sub_types: string[];
  confidence: number;
  people_mentioned: string[];
  title: string;
  corrected_transcript: string;
}

export interface SummaryResult {
  summary: string;
  key_points: string[];
  action_items: string[];
  decisions: string[];
}

export interface AcademicNotesResult {
  subject: string;
  title: string;
  structured_notes: string;
  key_concepts: string[];
  summary: string;
  definitions: { term: string; definition: string }[];
  formulas: { name: string; formula: string }[];
  comparisons: { item1: string; item2: string; basis: string }[];
}

export interface MeetingNotesResult {
  title: string;
  attendees: string[];
  agenda: string;
  action_items: { task: string; owner: string; due: string }[];
  decisions: string[];
  problems: string[];
  key_numbers: { label: string; value: string }[];
  structured_notes: string;
  summary: string;
}

export interface DailySummaryResult {
  summary: string;
  smart_prompt: string;
  prompt_link: string;
}

export async function classifyTranscript(transcript: string): Promise<ClassificationResult> {
  return processTranscript(transcript, "classify");
}

export async function summarizeTranscript(transcript: string): Promise<SummaryResult> {
  return processTranscript(transcript, "summarize");
}

export async function generateAcademicNotes(transcript: string): Promise<AcademicNotesResult> {
  return processTranscript(transcript, "academic_notes");
}

export async function generateMeetingNotes(transcript: string): Promise<MeetingNotesResult> {
  return processTranscript(transcript, "meeting_notes");
}

export async function getDailySummary(dayData: string): Promise<DailySummaryResult> {
  return processTranscript(dayData, "daily_summary");
}
