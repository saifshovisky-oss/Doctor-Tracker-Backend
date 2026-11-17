import type { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedData<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string): void {
  const body: ApiSuccess<T> = { success: true, data, ...(message ? { message } : {}) };
  res.status(statusCode).json(body);
}

export function buildPaginated<T>(
  data: T[],
  totalItems: number,
  currentPage: number,
  limit: number,
): PaginatedData<T> {
  return {
    data,
    currentPage,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    totalItems,
    limit,
  };
}
