import type { Meter, MeterInterface, WeatherReading } from './types.ts';

export class IndoorMeter implements MeterInterface {
  private readonly meter: Meter;

  constructor(meter: Meter) {
    this.meter = meter;
  }

  public getMeter(): Meter {
    return { ...this.meter };
  }

  public async read(): Promise<WeatherReading> {
    throw new Error('Not yet implemented');
  }
}
