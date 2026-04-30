import { User } from 'firebase/auth';

export type Subject = {
  id: string;
  name: string;
  type: 'character' | 'object';
  objectCategory?: string;
  data: string;
  mimeType: string;
  url: string;
  isSaved?: boolean;
};

export type Adventure = {
  id: string;
  prompt: string;
  description: string;
  imageUrl?: string;
  loading: boolean;
  error?: string;
  aspectRatio: string;
  isFavorite?: boolean;
  subjectNames?: string[];
  subjectTypes?: string[];
  filter?: string;
  animation?: string;
};

export type Toast = {
  id: string;
  message: string;
  type: 'error' | 'success';
};

export type TemplateImage = {
  id: string;
  imageUrl: string;
  location: string;
  template_description: string;
  aspect_ratio: string;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
