import os from 'os';
import { exec } from 'child_process';

const isWindows = os.type().toLowerCase().includes('windows');

export const killPort = (port: number) => {
  return new Promise((resolve, reject) => {
    if (!isWindows)
      resolve(
        `Killing process on port ${port} is not supported on non-Windows platforms`
      );

    try {
      exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        if (!stdout) {
          resolve(`No process found on port ${port}`);
          return;
        }

        const lines = stdout.trim().split('\n');
        if (lines.length > 0) {
          const pidToKill = lines[0].split(/\s+/)[4];
          exec(`taskkill /F /PID ${pidToKill}`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(`Killed process with PID ${pidToKill} on port ${port}`);
          });
        } else {
          resolve(`No process found on port ${port}`);
        }
      });
    } catch (error) {
      resolve(`No process found on port ${port}`);
    }
  });
};
