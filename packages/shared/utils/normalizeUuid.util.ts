// Normalize BLE identifiers before comparing advertisement service UUIDs.

export const normalizeUuid = (uuid = ''): string => {
  return uuid.toLowerCase().replaceAll('-', '');
};
