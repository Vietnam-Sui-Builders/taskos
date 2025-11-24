// File: components/marketplace/types.ts

export interface Experience {
  id: string;
  skill: string;
  domain: string;
  difficulty: number;
  quality_score: number;
  price: number;
  seller: string;
  rating: number;
  soldCount: number;
  walrus_blob_id: string;
  seal_policy_id: string;
  timeSpent?: number;
}

export interface PurchaseListing {
  id?: string;
  experienceId: string;
  licenseType: 'personal' | 'commercial' | 'ai_training';
  price: number;
}

export interface AppError {
  userMessage?: string;
  message?: string;
  details?: any;
  stack?: string;
}

export interface ExperienceData {
  skill: string;
  domain: string;
  difficulty: number;
  timeSpent: number;
  quality_score: number;
  [key: string]: any;
}
