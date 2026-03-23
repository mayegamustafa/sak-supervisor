export type Term = 'Term 1' | 'Term 2' | 'Term 3';

export interface VisitLog {
  id: string;
  supervisor_id: string;
  supervisor_name: string;
  school_id: string;
  school_name: string;
  visit_date: string;
  term: Term;
  week: number;
  visit_notes: string;
  created_at: string;
}
