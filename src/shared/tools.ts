export const jsonStringify = (obj: any) => JSON.stringify(obj, null, 2);

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const delaySync = async (ms: number) => {
  await delay(ms);
};
