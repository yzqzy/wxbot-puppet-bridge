export const jsonStringify = (obj: any) => JSON.stringify(obj, null, 2);

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};
