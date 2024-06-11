import fs from 'fs';
import childProcess from 'child_process';

(async () => {
  try {
    // Remove current build
    await remove('./dist/');
    // Remove current types
    await remove('./types/');
    // Build
    await exec(
      'tsc --build tsconfig.prod.json && tsc-alias -p tsconfig.prod.json',
      './'
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

function remove(loc: string): Promise<void> {
  return fs.promises.rm(loc, { recursive: true, force: true });
}

function exec(cmd: string, loc: string): Promise<void> {
  return new Promise((res, rej) => {
    return childProcess.exec(cmd, { cwd: loc }, (err, stdout, stderr) => {
      if (!!stdout) {
        console.log(stdout);
      }
      if (!!stderr) {
        console.error(stderr);
      }
      return !!err ? rej(err) : res();
    });
  });
}
