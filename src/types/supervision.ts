export interface ToolArea {
  id: string;
  name: string;
  expected_score: number;
  attributes: string[];
}

export interface SupervisionTool {
  id: string;
  name: string;
  department: string;
  areas: ToolArea[];
  created_by: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface AreaScore {
  area_id: string;
  area_name: string;
  expected_score: number;
  actual_score: number;
  observation: string;
  attributes: string[];
}

export interface SupervisionSession {
  id: string;
  tool_id: string;
  tool_name: string;
  department: string;
  school_id: string;
  school_name: string;
  supervisor_id: string;
  supervisor_name: string;
  total_score: number;
  area_scores: AreaScore[];
  key_strengths: string;
  key_improvements: string;
  supervisor_signature: string;
  headteacher_name: string;
  headteacher_signature: string;
  session_date: string;
  created_at: string;
}
