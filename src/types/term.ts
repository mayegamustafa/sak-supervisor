import { Term } from './visit';

export interface TermConfig {
  id: string;
  term: Term;
  year: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}
