import { environment } from './environment.ts';
import { getMeterAdvertisement } from './meter.repository.ts';
import { normalizeUuid } from './normalizeUuid.util.ts';
import {
  type Meter,
  type MeterAdvertisement,
  type MeterInterface,
  type WeatherReading,
  weatherReadingSchema,
} from './types.ts';

type UpdateReadingInput = {
  advertisement: MeterAdvertisement;
  reading: Partial<WeatherReading>;
};

export class OutdoorMeter implements MeterInterface {
  private readonly meter: Meter;

  constructor(meter: Meter) {
    this.meter = meter;
  }

  public getMeter(): Meter {
    return { ...this.meter };
  }

  public async read(): Promise<WeatherReading> {
    const reading: Partial<WeatherReading> = {};

    // Retry because measurements and battery can arrive in separate advertisements.
    for (
      let scanAttempt = 0;
      scanAttempt < environment.SCAN_RETRIES;
      scanAttempt += 1
    ) {
      console.log(
        `Device type: ${this.meter.type}, DeviceId: ${this.meter.deviceId}, scan attempt ${scanAttempt + 1}`,
      );

      const advertisement = await getMeterAdvertisement(this.meter.deviceId);

      if (advertisement) {
        const completeReading = this.updateReading({
          advertisement,
          reading,
        });
        if (completeReading) return completeReading;
      }
    }

    throw new Error(
      `No complete reading from ${this.meter.deviceId} after ${environment.SCAN_RETRIES} scan attempts. ` +
        'Move the Bluetooth adapter closer to the thermometer.',
    );
  }

  private decodeMeasurements({
    manufacturerData,
  }: MeterAdvertisement): Pick<
    WeatherReading,
    'temperature' | 'humidity'
  > | null {
    if (
      !manufacturerData ||
      manufacturerData.length < 13 ||
      manufacturerData[0] !== 0x69 ||
      manufacturerData[1] !== 0x09 ||
      manufacturerData[2] !== 0xd1
    ) {
      return null;
    }

    const temperatureDecimal = (manufacturerData[10] & 0x0f) / 10;
    const temperatureInteger = manufacturerData[11] & 0x7f;
    const temperatureSign = manufacturerData[11] & 0x80 ? 1 : -1;

    return {
      temperature: Number(
        ((temperatureInteger + temperatureDecimal) * temperatureSign).toFixed(
          1,
        ),
      ),
      humidity: manufacturerData[12] & 0x7f,
    };
  }

  private decodeBattery({ serviceData }: MeterAdvertisement): number | null {
    const batteryData = serviceData.find(
      ({ uuid, data }) =>
        normalizeUuid(uuid) === 'fd3d' && data.length >= 3 && data[0] === 0x77,
    )?.data;

    return batteryData ? batteryData[2] & 0x7f : null;
  }

  private updateReading({
    advertisement,
    reading,
  }: UpdateReadingInput): WeatherReading | null {
    if (reading.temperature === undefined || reading.humidity === undefined) {
      const measurements = this.decodeMeasurements(advertisement);
      if (measurements) Object.assign(reading, measurements);
    }

    if (reading.battery === undefined) {
      const battery = this.decodeBattery(advertisement);
      if (battery !== null) reading.battery = battery;
    }

    reading.signalPowerDBM = advertisement.signalPowerDBM;

    const result = weatherReadingSchema.safeParse(reading);
    return result.success ? result.data : null;
  }
}
