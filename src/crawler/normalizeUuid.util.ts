export const normalizeUuid = (uuid = ''): string => {
  return uuid.toLowerCase().replaceAll('-', '');
};
