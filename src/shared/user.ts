import os from 'os';

export const getRootPath = () => {
  const userInfo = os.userInfo();
  const rootPath = `${userInfo.homedir}\\Documents\\WeChat Files\\`;
  return rootPath;
};
