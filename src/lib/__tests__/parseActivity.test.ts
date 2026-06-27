import { describe, expect, it } from 'vitest';

import { parseActivityFile } from '../parseActivity';
import { SAMPLE_GPX } from './fixtures';

describe('parseActivityFile', () => {
  it('routes .gpx uploads through the GPX parser', async () => {
    const file = new File([SAMPLE_GPX], 'activity.gpx', {
      type: 'application/gpx+xml',
    });

    const { activity, fitDebug } = await parseActivityFile(file);

    expect(fitDebug).toBeUndefined();
    expect(activity.source).toBe('gpx');
    expect(activity.points).toHaveLength(3);
  });

  it('rejects unsupported extensions', async () => {
    const file = new File(['not a track'], 'notes.txt', { type: 'text/plain' });

    await expect(parseActivityFile(file)).rejects.toThrow(
      'Unsupported file type. Upload a .fit or .gpx file.',
    );
  });
});
