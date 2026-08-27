import { normalizeUuid } from '@wx/shared';
import type { Advertisement } from '#types.ts';
import { type DecodedAdvertisement, Meter } from './Meter.ts';

export class IndoorMeter extends Meter {
  protected decodeAdvertisement({
    serviceData,
  }: Advertisement): DecodedAdvertisement {
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
