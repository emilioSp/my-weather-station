// Validate query parameters for the weather measurement endpoints.
import { z } from 'zod';

export const latestMeasureQuerySchema = z.object({
  device_name: z.string().refine((name) => name.trim().length > 0, 'Device name must not be blank'),
});

const timestampSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => Temporal.Instant.from(value.replace(/(\.\d{9})\d+/, '$1')));

export const chartHistoryQuerySchema = z
  .object({
    start_date: timestampSchema,
    end_date: timestampSchema.optional(),
  })
  .refine(
    ({ start_date, end_date }) => !end_date || Temporal.Instant.compare(start_date, end_date) <= 0,
    {
      path: ['end_date'],
      message: 'End date must not precede start date',
    },
  );

export type ChartHistoryQuery = z.infer<typeof chartHistoryQuerySchema>;
