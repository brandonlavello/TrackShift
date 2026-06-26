import { parseFit } from './parseFit';
import { parseGpx } from './parseGpx';
import type { ActivityTrack, FitParseDebug } from './trackTypes';

export type ParseActivityResult = {
  activity: ActivityTrack;
  fitDebug?: FitParseDebug;
};

function extension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1)! : '';
}

export async function parseActivityFile(file: File): Promise<ParseActivityResult> {
  const ext = extension(file.name);

  if (ext === 'fit') {
    const buffer = await file.arrayBuffer();
    const { activity, debug } = await parseFit(buffer, file.name);
    return { activity, fitDebug: debug };
  }

  if (ext === 'gpx') {
    const text = await file.text();
    const activity = await parseGpx(text, file.name);
    return { activity };
  }

  throw new Error('Unsupported file type. Upload a .fit or .gpx file.');
}
