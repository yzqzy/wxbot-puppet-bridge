import fs from 'fs';

export function createDirIfNotExist(dir: string): void {
  if (fs.existsSync(dir)) return;
  fs.mkdirSync(dir, { recursive: true });
}

export function removeDir(dir: string): void {
  fs.rmdirSync(dir, { recursive: true });
}

export function removeFile(filePath: string): void {
  fs.unlinkSync(filePath);
}

export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content);
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}
