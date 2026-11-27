// Store committed E2E readings in local PostgreSQL and remove only this test's rows during teardown.
import { randomUUID } from 'node:crypto';

import { METER_TYPES, type Measurement } from '@wx/shared';
import { Client } from 'pg';

type StoredReadingInput = Pick<
  Measurement,
  'measured_at' | 'temperature' | 'humidity' | 'dew_point' | 'heat_index'
> &
  Partial<Pick<Measurement, 'signal_power_dbm'>>;

export class MeasurementStore {
  public readonly deviceName: string;
  private readonly rowIds: string[] = [];
  private readonly database = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: process.env.POSTGRES_DB ?? 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  public constructor(deviceName: string) {
    this.deviceName = deviceName;
  }

  public async connect() {
    await this.database.connect();
  }

  public async insertReading(reading: StoredReadingInput) {
    const id = randomUUID();
    this.rowIds.push(id);
    await this.database.query(
      `INSERT INTO measures (
        id, device_id, device_name, device_type, temperature, dew_point,
        heat_index, humidity, battery, signal_power_dbm, measured_at
      ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, 80, $8, $9)`,
      [
        id,
        this.deviceName,
        METER_TYPES.OUTDOOR,
        reading.temperature,
        reading.dew_point,
        reading.heat_index,
        reading.humidity,
        reading.signal_power_dbm ?? -50,
        reading.measured_at,
      ],
    );
  }

  public async deleteInsertedRowsAndClose() {
    try {
      await this.database.query('DELETE FROM measures WHERE id = ANY($1::uuid[])', [this.rowIds]);
    } finally {
      await this.database.end();
    }
  }
}
