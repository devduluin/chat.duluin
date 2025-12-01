export interface Form {
  id?: string;
  user_id?: string;
  company_id: string;
  title: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  time_out?: number;
  disallow_multiple_response?: boolean;
  archive_at?: string | null;
  random_order?: boolean;
  publish_result?: boolean;
  publish_status?:"public" | "private",
  show_point?: boolean;
  show_answer?: boolean;
  is_favorite?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type FormSettingsPayload = Partial<{
  time_out: number;
  disallow_multiple_response: boolean;
  random_order: boolean;
  archive_at: string | null;
  publish_result: boolean;
  show_point: boolean;
  show_answer: boolean;
}>;