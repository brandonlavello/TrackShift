import { describe, expect, it } from 'vitest';

import { parseGpx } from '../parseGpx';
import { SAMPLE_GPX } from './fixtures';

describe('parseGpx', () => {
  it('parses track points with time, position, and optional elevation', async () => {
    const activity = await parseGpx(SAMPLE_GPX, 'sample.gpx');

    expect(activity.source).toBe('gpx');
    expect(activity.fileName).toBe('sample.gpx');
    expect(activity.points).toHaveLength(3);
    expect(activity.points[0]).toMatchObject({
      lat: 25,
      lon: -80,
      elevation: 10.5,
      source: 'gpx',
    });
    expect(activity.points[1].elevation).toBeUndefined();
    expect(activity.startTime?.toISOString()).toBe('2024-06-01T12:00:00.000Z');
    expect(activity.endTime?.toISOString()).toBe('2024-06-01T12:00:02.000Z');
    expect(activity.availableFields).toEqual(
      expect.arrayContaining(['time', 'lat', 'lon', 'elevation', 'source']),
    );
  });

  it('rejects invalid XML', async () => {
    await expect(parseGpx('<not-gpx', 'bad.gpx')).rejects.toThrow(
      'Invalid GPX file.',
    );
  });

  it('rejects GPX without track points', async () => {
    const emptyGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrackShift-test">
  <trk><trkseg></trkseg></trk>
</gpx>`;

    await expect(parseGpx(emptyGpx, 'empty.gpx')).rejects.toThrow(
      'No track points found in GPX file.',
    );
  });
});
