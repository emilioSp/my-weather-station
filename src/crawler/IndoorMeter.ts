import { environment } from './environment.ts';
import { type DecodedAdvertisement, Meter } from './Meter.ts';
import { getMeterAdvertisement } from './meter.repository.ts';
import { normalizeUuid } from './normalizeUuid.util.ts';
import type { MeterAdvertisement, WeatherReading } from './types.ts';

export class IndoorMeter extends Meter {
  public async read(): Promise<WeatherReading> {
    const reading: Partial<WeatherReading> = {};

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

  protected decodeAdvertisement({
    serviceData,
  }: MeterAdvertisement): DecodedAdvertisement {
    const data = serviceData.find(
      ({ uuid, data }) =>
        normalizeUuid(uuid) === 'fd3d' &&
        data.length >= 6 &&
        (data[0] & 0x7f) === 0x54,
    )?.data;

    if (!data) return {};

    const temperatureDecimal = (data[3] & 0x0f) / 10;
    const temperatureInteger = data[4] & 0x7f;
    const temperatureSign = data[4] & 0x80 ? 1 : -1;

    return {
      temperature: Number(
        ((temperatureInteger + temperatureDecimal) * temperatureSign).toFixed(
          1,
        ),
      ),
      humidity: data[5] & 0x7f,
      battery: data[2] & 0x7f,
    };
  }
}
