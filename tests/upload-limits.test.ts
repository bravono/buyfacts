import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Upload File Size Limit (1GB) and Validation Suite', () => {
  const ONE_GB_BYTES = 1024 * 1024 * 1024; // 1,073,741,824 bytes
  const S3_MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

  const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];
  const ALLOWED_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'mp4', 'webm', 'ogg', 'mov', 'mkv',
    'mp3', 'wav', 'aac', 'flac', 'm4a',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'
  ];

  function validateUploadFile(file: { name: string; size: number; type: string }): string | null {
    if (file.size > ONE_GB_BYTES) {
      const sizeFormatted = file.size >= ONE_GB_BYTES
        ? `${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB`
        : `${(file.size / (1024 * 1024)).toFixed(1)}MB`;
      return `File exceeds maximum limit of 1GB (${sizeFormatted})`;
    }
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) => file.type && file.type.startsWith(prefix));
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(fileExt);
    if (!isAllowedMime && !isAllowedExt) {
      return 'Unsupported file format.';
    }
    return null;
  }

  test('should accept files within the 1GB limit', () => {
    // 500MB video
    const halfGig = validateUploadFile({
      name: 'product-demo.mp4',
      size: 500 * 1024 * 1024,
      type: 'video/mp4',
    });
    assert.equal(halfGig, null);

    // Exactly 1GB video boundary
    const exactGig = validateUploadFile({
      name: 'large-presentation.mp4',
      size: ONE_GB_BYTES,
      type: 'video/mp4',
    });
    assert.equal(exactGig, null);
  });

  test('should reject files exceeding 1GB by even 1 byte', () => {
    const overByOneByte = validateUploadFile({
      name: 'heavy-footage.mov',
      size: ONE_GB_BYTES + 1,
      type: 'video/quicktime',
    });
    assert.ok(overByOneByte !== null);
    assert.ok(overByOneByte.includes('File exceeds maximum limit of 1GB'));
    assert.ok(overByOneByte.includes('1.00GB'));
  });

  test('should reject very large files with properly formatted GB size in error message', () => {
    const twoGigs = validateUploadFile({
      name: 'raw-archive.zip',
      size: 2 * ONE_GB_BYTES,
      type: 'application/zip',
    });
    assert.ok(twoGigs !== null);
    assert.equal(twoGigs, 'File exceeds maximum limit of 1GB (2.00GB)');
  });

  test('should reject files with unsupported extensions and mime types', () => {
    const exeFile = validateUploadFile({
      name: 'malware.exe',
      size: 10 * 1024 * 1024,
      type: 'application/x-msdownload',
    });
    assert.equal(exeFile, 'Unsupported file format.');
  });

  test('should correctly compute multipart chunk count for 1GB media', () => {
    const calculateParts = (size: number, chunkSize = S3_MIN_CHUNK_SIZE) =>
      Math.max(1, Math.ceil(size / chunkSize));

    // 1GB is 1073741824 bytes. 1073741824 / 5242880 = 204.8 -> 205 parts
    const partsFor1GB = calculateParts(ONE_GB_BYTES);
    assert.equal(partsFor1GB, 205);

    // 205 parts is well below S3 limit of 10000 parts
    assert.ok(partsFor1GB <= 10000);
  });

  test('should route files over 100MB to multipart chunking', () => {
    const shouldRouteToMultipart = (fileSize: number, selectedMethod: string): string => {
      if (selectedMethod === 'multipart' || fileSize > 100 * 1024 * 1024) {
        return 'multipart';
      }
      return selectedMethod;
    };

    // User selected direct presigned PUT for 50MB file
    assert.equal(shouldRouteToMultipart(50 * 1024 * 1024, 'presigned'), 'presigned');

    // User selected server route for 50MB file
    assert.equal(shouldRouteToMultipart(50 * 1024 * 1024, 'server'), 'server');

    // User selected server route for 200MB file -> auto-routes to multipart
    assert.equal(shouldRouteToMultipart(200 * 1024 * 1024, 'server'), 'multipart');

    // User selected presigned PUT for 1GB file -> auto-routes to multipart
    assert.equal(shouldRouteToMultipart(ONE_GB_BYTES, 'presigned'), 'multipart');
  });
});
