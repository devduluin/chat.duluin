// types/question.ts or models/question.ts

export interface Metadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type QuestionType =
  | 'open'
  | 'single'
  | 'multiple'
  | 'rating'
  | 'nps'
  | 'date'
  | 'file'
  | 'number'
  | 'section';

export interface Question {
  id: string;
  form_id: string;
  type: QuestionType;
  format?: string;
  text?: string;
  is_required?: boolean;
  point?: number;
  answer_option_id?: string;
  qorder?: number;
  placeholder?: string;
  help_text?: string;
  scale_min?: number;
  scale_max?: number;
  options?: string[];
  page?: number;
}

export type Answer = {
  id: string;
  question_id: string;
  answer_text: string;
  question: {
    text: string;
  };
};

export type Option ={
  id?: string;
  question_id: string;
  text: string;
  value?: string;
}