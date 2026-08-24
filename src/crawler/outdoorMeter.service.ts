import { environment } from './environment.ts';
import { readOutdoorMeterAdvertisement } from './meter.repository.ts';
import { normalizeUuid } from './normalizeUuid.util.ts';
import {
  type MeterAdvertisement,
  type WeatherReading,
  weatherReadingSchema,
} from './types.ts';

type Measurements = {
  temperature: number;
  humidity: number;
};

type DecodeMeasurementsInput = Pick<MeterAdvertisement, 'manufacturerData'>;

const decodeOutdoorMeasurements = ({
  manufacturerData,
}: DecodeMeasurementsInput): Measurements | null => {
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
      ((temperatureInteger + temperatureDecimal) * temperatureSign).toFixed(1),
    ),
    humidity: manufacturerData[12] & 0x7f,
  };
};

type DecodeBatteryInput = Pick<MeterAdvertisement, 'serviceData'>;

const decodeOutdoorBattery = ({
  serviceData,
}: DecodeBatteryInput): number | null => {
  const batteryData = serviceData.find(
    ({ uuid, data }) =>
      normalizeUuid(uuid) === 'fd3d' && data.length >= 3 && data[0] === 0x77,
  )?.data;

  return batteryData ? batteryData[2] & 0x7f : null;
};

type GetCompleteReadingInput = {
  reading: Partial<WeatherReading>;
};

const getCompleteOutdoorReading = ({
  reading,
}: GetCompleteReadingInput): WeatherReading | null => {
  const result = weatherReadingSchema.safeParse(reading);
  return result.success ? result.data : null;
};

type UpdateReadingInput = {
  advertisement: MeterAdvertisement;
  reading: Partial<WeatherReading>;
};

const updateOutdoorReading = ({
  advertisement,
  reading,
}: UpdateReadingInput): WeatherReading | null => {
  const measurements = decodeOutdoorMeasurements(advertisement);
  const battery = decodeOutdoorBattery(advertisement);

  reading.signalPowerDBM = advertisement.signalPowerDBM;
  if (measurements) Object.assign(reading, measurements);
  if (battery !== null) reading.battery = battery;

  return getCompleteOutdoorReading({ reading });
};

export const readOutdoorMeter = async (
  deviceId: string,
): Promise<WeatherReading> => {
  const reading: Partial<WeatherReading> = {};

  // Retry because measurements and battery can arrive in separate advertisements.
  for (
    let scanAttempt = 0;
    scanAttempt < environment.SCAN_RETRIES;
    scanAttempt += 1
  ) {
    console.log(`DeviceId: ${deviceId}, scan attempt ${scanAttempt + 1}`);

    const advertisement = await readOutdoorMeterAdvertisement(deviceId);

    if (advertisement) {
      const completeReading = updateOutdoorReading({
        advertisement,
        reading,
      });
      if (completeReading) return completeReading;
    }
  }

  throw new Error(
    `No complete reading from ${deviceId} after ${environment.SCAN_RETRIES} scan attempts. ` +
      'Move the Bluetooth adapter closer to the thermometer.',
  );
};
