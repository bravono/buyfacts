import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFolderPrefix } from '../lib/minio';

describe('Folder & Directory Upload Hierarchy Preservation', () => {
  // Helper simulating folder subpath resolution used in FileUploader.tsx
  const resolveItemDestination = (baseDestination: string, relativePath?: string): string => {
    if (!relativePath) return baseDestination;
    const normalized = relativePath.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash > 0) {
      const subDir = normalized.substring(0, lastSlash);
      return `${baseDestination}/${subDir}`;
    }
    return baseDestination;
  };

  test('should return base destination when file has no relative path', () => {
    const dest = resolveItemDestination('cubicon');
    assert.equal(dest, 'cubicon');

    const destRoot = resolveItemDestination('products-services', 'image.png');
    assert.equal(destRoot, 'products-services');
  });

  test('should extract single-level subfolder from relative path', () => {
    const dest = resolveItemDestination('cubicon', 'my-3d-model/cube.glb');
    assert.equal(dest, 'cubicon/my-3d-model');
  });

  test('should extract multi-level nested subfolder hierarchy', () => {
    const dest = resolveItemDestination(
      'research-imperatives',
      'q1-report/data/visuals/chart.png'
    );
    assert.equal(dest, 'research-imperatives/q1-report/data/visuals');
  });

  test('should normalize backslashes from Windows file paths', () => {
    const dest = resolveItemDestination(
      'products-services',
      'assets\\textures\\diffuse_map.jpg'
    );
    assert.equal(dest, 'products-services/assets/textures');
  });

  test('should sanitize nested destination folders with sanitizeFolderPrefix', () => {
    const rawDest = resolveItemDestination(
      'cubicon',
      'project alpha/special #1/model.obj'
    );
    const sanitized = sanitizeFolderPrefix(rawDest);
    assert.equal(sanitized, 'cubicon/project_alpha/special__1');
  });
});
