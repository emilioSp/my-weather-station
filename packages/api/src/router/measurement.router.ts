// Expose read-only weather measurement endpoints through Hono.
import { Hono } from 'hono';

import { BadRequestError } from '#application-errors/bad-request.error.ts';
import {
  chartHistoryQuerySchema,
  latestMeasurementQuerySchema,
} from '#schema/measurement.schema.ts';
import { getChartHistory, getLatestMeasurement } from '#service/measurement.service.ts';

export const measurementRouter = new Hono()
  .get('/get-latest-measure', async (context) => {
    const query = latestMeasurementQuerySchema.safeParse(context.req.query());

    if (!query.success) {
      throw new BadRequestError({ message: 'Validation failed', error: query.error });
    }

    return context.json(await getLatestMeasurement(query.data.device_name));
  })
  .get('/get-chart-history', async (context) => {
    const query = chartHistoryQuerySchema.safeParse(context.req.query());

    if (!query.success) {
      throw new BadRequestError({ message: 'Validation failed', error: query.error });
    }

    return context.json(await getChartHistory(query.data));
  });
