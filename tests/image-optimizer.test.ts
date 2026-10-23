import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isConvertibleImage,
  changeExtensionToWebp,
  changePathToWebp,
  calculateSavingsPercentage,
  convertImageToWebp,
  CONVERTIBLE_EXTENSIONS,
  EXCLUDED_EXTENSIONS,
} from '../lib/image-optimizer';

describe('Client-Side Image Optimization & WebP Conversion Suite', () => {
  test('1. isConvertibleImage correctly detects convertible image formats', () => {
    // Standard formats
    assert.equal(isConvertibleImage({ name: 'photo.jpg', type: 'image/jpeg' }), true);
    assert.equal(isConvertibleImage({ name: 'graphic.jpeg', type: 'image/jpeg' }), true);
    assert.equal(isConvertibleImage({ name: 'screenshot.png', type: 'image/png' }), true);
    assert.equal(isConvertibleImage({ name: 'texture.bmp', type: 'image/bmp' }), true);

    // Case insensitivity
    assert.equal(isConvertibleImage({ name: 'HEADER.JPG' }), true);
    assert.equal(isConvertibleImage({ name: 'BANNER.PNG' }), true);
    assert.equal(isConvertibleImage({ name: 'DIFFUSE.BMP' }), true);
  });

  test('2. isConvertibleImage strictly excludes SVGs, GIFs, WebPs, and non-image files', () => {
    // Vector graphics must remain SVG
    assert.equal(isConvertibleImage({ name: 'logo.svg', type: 'image/svg+xml' }), false);
    assert.equal(isConvertibleImage({ name: 'icon.svg' }), false);

    // Animated GIFs must not be flattened into a static canvas frame
    assert.equal(isConvertibleImage({ name: 'animation.gif', type: 'image/gif' }), false);
    assert.equal(isConvertibleImage({ name: 'reaction.gif' }), false);

    // Already WebP files require no re-encoding
    assert.equal(isConvertibleImage({ name: 'optimized.webp', type: 'image/webp' }), false);

    // Non-images (videos, documents, 3D models)
    assert.equal(isConvertibleImage({ name: 'demo.mp4', type: 'video/mp4' }), false);
    assert.equal(isConvertibleImage({ name: 'document.pdf', type: 'application/pdf' }), false);
    assert.equal(isConvertibleImage({ name: 'character.glb' }), false);
    assert.equal(isConvertibleImage({ name: 'model.gltf' }), false);
  });

  test('3. changeExtensionToWebp replaces extensions accurately', () => {
    assert.equal(changeExtensionToWebp('vacation.jpg'), 'vacation.webp');
    assert.equal(changeExtensionToWebp('HERO_IMAGE.JPEG'), 'HERO_IMAGE.webp');
    assert.equal(changeExtensionToWebp('transparent_icon.png'), 'transparent_icon.webp');
    assert.equal(changeExtensionToWebp('normal_map.bmp'), 'normal_map.webp');
    assert.equal(changeExtensionToWebp('archive.photo.2026.png'), 'archive.photo.2026.webp');

    // Idempotent for WebP
    assert.equal(changeExtensionToWebp('already_optimized.webp'), 'already_optimized.webp');

    // No extension
    assert.equal(changeExtensionToWebp('nameless_file'), 'nameless_file.webp');
  });

  test('4. changePathToWebp preserves nested folder hierarchy', () => {
    assert.equal(
      changePathToWebp('cubicon/models/textures/diffuse.jpg'),
      'cubicon/models/textures/diffuse.webp'
    );
    assert.equal(
      changePathToWebp('products-services/assets/header.png'),
      'products-services/assets/header.webp'
    );
    assert.equal(
      changePathToWebp('windows\\style\\path\\image.jpeg'),
      'windows/style/path/image.webp'
    );
    assert.equal(changePathToWebp('standalone.png'), 'standalone.webp');
    assert.equal(changePathToWebp(undefined), undefined);
  });

  test('5. calculateSavingsPercentage computes accurate reduction ratios', () => {
    // 5 MB to 1 MB = 80% reduction
    assert.equal(calculateSavingsPercentage(5000000, 1000000), 80);

    // 10 MB to 3.5 MB = 65% reduction
    assert.equal(calculateSavingsPercentage(10000000, 3500000), 65);

    // No savings (same size or larger)
    assert.equal(calculateSavingsPercentage(1000, 1000), 0);
    assert.equal(calculateSavingsPercentage(1000, 1200), 0);
    assert.equal(calculateSavingsPercentage(0, 100), 0);
  });

  test('6. convertImageToWebp gracefully falls back in non-browser environment or for ineligible files', async () => {
    // Mock File object
    const mockSvg = new File(['<svg></svg>'], 'badge.svg', { type: 'image/svg+xml' });
    const resultSvg = await convertImageToWebp(mockSvg);
    assert.equal(resultSvg.converted, false);
    assert.equal(resultSvg.file.name, 'badge.svg');

    // Mock JPG outside browser environment (window undefined)
    const mockJpg = new File(['fake-jpg-data'], 'photo.jpg', { type: 'image/jpeg' });
    const resultJpg = await convertImageToWebp(mockJpg);
    assert.equal(resultJpg.converted, false);
    assert.equal(resultJpg.file.name, 'photo.jpg');
  });

  test('7. Strict Zero-Emoji compliance across all image optimization source and test files', () => {
    const filesToCheck = [
      'lib/image-optimizer.ts',
      'components/FileUploader.tsx',
      'components/FileUploader.module.css',
      'tests/image-optimizer.test.ts',
    ];

    const emojiRegex =
      /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const hasEmoji = emojiRegex.test(content);
        assert.equal(
          hasEmoji,
          false,
          `File ${relPath} contains prohibited emoji character.`
        );
      }
    }
  });
});
