import { environment } from './environment.ts';
import { type DecodedAdvertisement, Meter } from './Meter.ts';
import { getMeterAdvertisement } from './meter.repository.ts';
import { normalizeUuid } from './normalizeUuid.util.ts';
import type { MeterAdvertisement, WeatherReading } from './types.ts';

export class OutdoorMeter extends Meter {
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

  protected decodeAdvertisement({
    manufacturerData,
    serviceData,
  }: MeterAdvertisement): DecodedAdvertisement {
    const decodedAdvertisement: DecodedAdvertisement = {};

    if (
      manufacturerData &&
      manufacturerData.length >= 13 &&
      manufacturerData[0] === 0x69 &&
      manufacturerData[1] === 0x09 &&
      manufacturerData[2] === 0xd1
    ) {
      const temperatureDecimal = (manufacturerData[10] & 0x0f) / 10;
      const temperatureInteger = manufacturerData[11] & 0x7f;
      const temperatureSign = manufacturerData[11] & 0x80 ? 1 : -1;

      decodedAdvertisement.temperature = Number(
        ((temperatureInteger + temperatureDecimal) * temperatureSign).toFixed(
          1,
        ),
      );
      decodedAdvertisement.humidity = manufacturerData[12] & 0x7f;
    }

    const batteryData = serviceData.find(
      ({ uuid, data }) =>
        normalizeUuid(uuid) === 'fd3d' && data.length >= 3 && data[0] === 0x77,
    )?.data;

    if (batteryData) decodedAdvertisement.battery = batteryData[2] & 0x7f;

    return decodedAdvertisement;
  }
}
