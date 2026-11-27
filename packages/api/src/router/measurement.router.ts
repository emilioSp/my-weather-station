// Expose read-only weather measurement endpoints through Hono.
import { Hono } from 'hono';

import { BadRequestError } from '#application-errors/bad-request.error.ts';
import {
  chartHistoryQuerySchema,
  latestMeasurementQuerySchema,
} from '#schema/measurement.schema.ts';
import { getChartHistory, getLatestMeasurements } from '#service/measurement.service.ts';

export const measurementRouter = new Hono()
  .get('/get-latest-measure', async (context) => {
    const query = latestMeasurementQuerySchema.safeParse(context.req.queries());

    if (!query.success) {
      throw new BadRequestError({ message: 'Validation failed', error: query.error });
    }

    const { device_names: deviceNames } = query.data;
    const measurements = await getLatestMeasurements(deviceNames);

    return context.json(
      Object.fromEntries(deviceNames.map((deviceName, index) => [deviceName, measurements[index]])),
    );
  })
  .get('/get-chart-history', async (context) => {
    const query = chartHistoryQuerySchema.safeParse(context.req.query());

    if (!query.success) {
      throw new BadRequestError({ message: 'Validation failed', error: query.error });
    }

    return context.json(await getChartHistory(query.data));
  });
