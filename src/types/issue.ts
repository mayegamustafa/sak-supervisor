export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Pending' | 'In Progress' | 'Resolved';
export type IssueCategory =
  | 'Infrastructure'
  | 'Teaching'
  | 'Discipline'
  | 'Attendance'
  | 'Learning Materials'
  | 'Sanitation'
  | 'Other'
  | (string & {});

export interface Issue {
  id: string;
  school_id: string;
  school_name: string;
  class_section: string;
  category: IssueCategory;
  issue_title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  photo_url?: string;
  created_by: string;
  created_by_id: string;
  created_at: string;
}

export interface Resolution {
  id: string;
  issue_id: string;
  resolution_description: string;
  resolved_by: string;
  resolved_at: string;
}

export interface FollowUp {
  id: string;
  issue_id: string;
  comment: string;
  created_by: string;
  created_at: string;
}
