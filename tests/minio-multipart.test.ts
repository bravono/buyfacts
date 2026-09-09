import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('S3 Multipart Upload Chunking & Resumption Logic', () => {
  const S3_MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

  test('should calculate correct number of parts based on file size and 5MB chunk', () => {
    const calculateParts = (size: number, chunkSize = S3_MIN_CHUNK_SIZE) =>
      Math.max(1, Math.ceil(size / chunkSize));

    assert.equal(calculateParts(1024), 1); // 1 KB -> 1 part
    assert.equal(calculateParts(4 * 1024 * 1024), 1); // 4 MB -> 1 part
    assert.equal(calculateParts(5 * 1024 * 1024), 1); // 5 MB -> 1 part
    assert.equal(calculateParts(5 * 1024 * 1024 + 1), 2); // 5 MB + 1 byte -> 2 parts
    assert.equal(calculateParts(12 * 1024 * 1024), 3); // 12 MB -> 3 parts
    assert.equal(calculateParts(100 * 1024 * 1024), 20); // 100 MB -> 20 parts
  });

  test('should calculate accurate chunk byte boundaries for slicing', () => {
    const fileSize = 12 * 1024 * 1024; // 12 MB
    const totalParts = Math.ceil(fileSize / S3_MIN_CHUNK_SIZE); // 3 parts

    const slices: { partNumber: number; start: number; end: number; size: number }[] = [];
    for (let p = 1; p <= totalParts; p++) {
      const start = (p - 1) * S3_MIN_CHUNK_SIZE;
      const end = Math.min(start + S3_MIN_CHUNK_SIZE, fileSize);
      slices.push({ partNumber: p, start, end, size: end - start });
    }

    assert.equal(slices.length, 3);
    assert.equal(slices[0].start, 0);
    assert.equal(slices[0].end, 5242880);
    assert.equal(slices[0].size, 5242880); // 5 MB

    assert.equal(slices[1].start, 5242880);
    assert.equal(slices[1].end, 10485760);
    assert.equal(slices[1].size, 5242880); // 5 MB

    assert.equal(slices[2].start, 10485760);
    assert.equal(slices[2].end, 12582912);
    assert.equal(slices[2].size, 2097152); // 2 MB (last part can be < 5MB)
  });

  test('should format and sort completed parts ascending by PartNumber per S3 spec', () => {
    const rawParts = [
      { partNumber: 4, etag: 'etag-4' },
      { partNumber: 1, etag: '"etag-1"' },
      { partNumber: 3, etag: 'etag-3' },
      { partNumber: 2, etag: '"etag-2"' },
    ];

    const sorted = [...rawParts]
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.etag.replace(/^"+|"+$/g, ''),
      }));

    assert.deepEqual(sorted, [
      { PartNumber: 1, ETag: 'etag-1' },
      { PartNumber: 2, ETag: 'etag-2' },
      { PartNumber: 3, ETag: 'etag-3' },
      { PartNumber: 4, ETag: 'etag-4' },
    ]);
  });

  test('should detect missing chunks for resuming interrupted upload sessions', () => {
    const totalParts = 6;
    const completedParts = [
      { partNumber: 1, etag: 'etag1' },
      { partNumber: 2, etag: 'etag2' },
      { partNumber: 4, etag: 'etag4' },
    ];

    const completedSet = new Set(completedParts.map((p) => p.partNumber));
    const missingParts: number[] = [];

    for (let p = 1; p <= totalParts; p++) {
      if (!completedSet.has(p)) {
        missingParts.push(p);
      }
    }

    assert.deepEqual(missingParts, [3, 5, 6]);
  });

  test('should generate consistent storage key for upload resumption', () => {
    const filename = 'intro-video.mp4';
    const fileSize = 52428800;
    const lastModified = 1710000000000;
    const folder = 'cubicon';

    const key = `s3_multipart_${filename}_${fileSize}_${lastModified}_${folder}`;
    assert.equal(key, 's3_multipart_intro-video.mp4_52428800_1710000000000_cubicon');
  });
});
