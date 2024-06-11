import { exec } from 'child_process';

export const killPort = (port: number) => {
  return new Promise((resolve, reject) => {
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
      reject(error);
    }
  });
};
