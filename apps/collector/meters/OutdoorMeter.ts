import { normalizeUuid } from '@wx/shared';
import type { Advertisement } from '#types.ts';
import { type DecodedAdvertisement, Meter } from './Meter.ts';

export class OutdoorMeter extends Meter {
  protected decodeAdvertisement({
    manufacturerData,
    serviceData,
  }: Advertisement): DecodedAdvertisement {
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
