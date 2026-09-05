import { z } from 'zod';
import { AppError } from './errors.js';

export const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const checkoutSchema = z.object({
  couponCode: z.string().min(1).optional(),
});

export function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'request validation failed', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }
  return result.data;
}
