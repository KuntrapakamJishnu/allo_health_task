import { z } from 'zod';

export const CreateReservationSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  warehouseId: z.string().cuid('Invalid warehouse ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  idempotencyKey: z.string().optional(),
});

export const ConfirmReservationSchema = z.object({
  id: z.string().cuid('Invalid reservation ID'),
  idempotencyKey: z.string().optional(),
});

export const ReleaseReservationSchema = z.object({
  id: z.string().cuid('Invalid reservation ID'),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type ConfirmReservationInput = z.infer<typeof ConfirmReservationSchema>;
export type ReleaseReservationInput = z.infer<typeof ReleaseReservationSchema>;
