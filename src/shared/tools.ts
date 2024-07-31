export const jsonStringify = (obj: any) => JSON.stringify(obj, null, 2);

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const delaySync = async (ms: number) => {
  await delay(ms);
};

const setZero = (num: number) => (num < 10 ? `0${num}` : num);

export const getDates = (date?: Date) => {
  const now = date || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const millisecond = now.getMilliseconds();

  return {
    year: year,
    month: setZero(month),
    day: setZero(day),
    hour: setZero(hour),
    minute: setZero(minute),
    second: setZero(second),
    millisecond: setZero(millisecond),
    timestamp: now.getTime()
  };
};
