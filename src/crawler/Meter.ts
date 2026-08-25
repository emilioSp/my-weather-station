import {
  type MeterAdvertisement,
  type Meter as MeterConfiguration,
  type MeterInterface,
  type WeatherReading,
  weatherReadingSchema,
} from './types.ts';

export type DecodedAdvertisement = Partial<
  Pick<WeatherReading, 'temperature' | 'humidity' | 'battery'>
>;

type UpdateReadingInput = {
  advertisement: MeterAdvertisement;
  reading: Partial<WeatherReading>;
};

export abstract class Meter implements MeterInterface {
  protected readonly meter: MeterConfiguration;

  constructor(meter: MeterConfiguration) {
    this.meter = meter;
  }

  public getMeter(): MeterConfiguration {
    return { ...this.meter };
  }

  public abstract read(): Promise<WeatherReading>;

  protected abstract decodeAdvertisement(
    advertisement: MeterAdvertisement,
  ): DecodedAdvertisement;

  protected updateReading({
    advertisement,
    reading,
  }: UpdateReadingInput): WeatherReading | null {
    const decodedAdvertisement = this.decodeAdvertisement(advertisement);

    reading.temperature ??= decodedAdvertisement.temperature;
    reading.humidity ??= decodedAdvertisement.humidity;
    reading.battery ??= decodedAdvertisement.battery;
    reading.signalPowerDBM = advertisement.signalPowerDBM;

    const result = weatherReadingSchema.safeParse(reading);
    return result.success ? result.data : null;
  }
}
