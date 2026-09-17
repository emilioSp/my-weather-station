import {
  type Measure,
  type WeatherReading,
  weatherReadingSchema,
} from '@wx/shared';
import { getAdvertisement } from '#api/sensor.api.ts';
import { storeMeasure } from '#db/measure.repository.ts';
import { environment } from '#environment.ts';
import NoCompleteReadingError from '#errors/NoCompleteReadingError.ts';
import {
  type Advertisement,
  type Meter as MeterConfiguration,
  type MeterInterface,
  meterSchema,
} from '#types.ts';
import { calculateDewPoint } from './utils/calculateDewPoint.util.ts';
import { calculateHeatIndex } from './utils/calculateHeatIndex.util.ts';
import { formatMeasure } from './utils/formatMeasure.util.ts';

export type DecodedAdvertisement = Partial<
  Pick<WeatherReading, 'temperature' | 'humidity' | 'battery'>
>;

type UpdateReadingInput = {
  advertisement: Advertisement;
  reading: Partial<WeatherReading>;
};

type ConfiguredMeter = MeterConfiguration & { deviceName: string };

export abstract class Meter implements MeterInterface {
  protected readonly meter: ConfiguredMeter;

  constructor(meter: MeterConfiguration) {
    this.meter = meterSchema.parse(meter);
  }

  public getMeter(): MeterConfiguration {
    return { ...this.meter };
  }

  public async read(): Promise<Measure> {
    const reading: Partial<WeatherReading> = {};

    for (
      let scanAttempt = 0;
      scanAttempt < environment.SCAN_RETRIES;
      scanAttempt += 1
    ) {
      console.log(
        `Device type: ${this.meter.type}, device ID: ${this.meter.deviceId}, device name: ${this.meter.deviceName}, address: ${this.meter.address}, scan attempt ${scanAttempt + 1}`,
      );

      const advertisement = await getAdvertisement(this.meter);

      if (advertisement) {
        const completeReading = this.updateReading({
          advertisement,
          reading,
        });
        if (completeReading) {
          const measure = await storeMeasure({
            type: this.meter.type,
            deviceName: this.meter.deviceName,
            deviceId: advertisement.deviceId,
            address: advertisement.address,
            ...completeReading,
          });

          return formatMeasure(measure);
        }
      }
    }

    throw new NoCompleteReadingError(
      `No complete reading from ${this.meter.deviceId ?? this.meter.address} after ${environment.SCAN_RETRIES} scan attempts. ` +
        'Move the Bluetooth adapter closer to the thermometer.',
    );
  }

  protected abstract decodeAdvertisement(
    advertisement: Advertisement,
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

    if (reading.temperature !== undefined && reading.humidity !== undefined) {
      reading.dewPoint ??= calculateDewPoint({
        temperature: reading.temperature,
        humidity: reading.humidity,
      });
      reading.heatIndex ??= calculateHeatIndex({
        temperature: reading.temperature,
        humidity: reading.humidity,
      });
    }

    const result = weatherReadingSchema.safeParse(reading);
    return result.success ? result.data : null;
  }
}
