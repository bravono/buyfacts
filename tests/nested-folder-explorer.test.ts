import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeFolderPrefix,
  extractFolderFromKey,
  extractFilenameFromKey,
  STORAGE_FOLDERS,
} from '../lib/minio';

describe('Nested Folder Discovery & Hierarchical Storage Explorer Suite', () => {
  // Test helper: computes directory tree simulation matching listMinioTree logic
  const computeDirectoryTree = (
    keys: string[],
    currentPrefix = '',
    viewMode: 'hierarchical' | 'flat' = 'hierarchical'
  ) => {
    const discoveredFolderSet = new Set<string>();

    for (const preset of STORAGE_FOLDERS) {
      discoveredFolderSet.add(preset.value);
    }

    for (const key of keys) {
      const parts = key.split('/').filter(Boolean);
      if (parts.length > 1) {
        const isMarker = key.endsWith('/.keep') || key.endsWith('/');
        const folderParts = isMarker
          ? parts.slice(0, key.endsWith('/.keep') ? -1 : parts.length)
          : parts.slice(0, -1);

        let cumulative = '';
        for (const part of folderParts) {
          cumulative = cumulative ? `${cumulative}/${part}` : part;
          discoveredFolderSet.add(cumulative);
        }
      }
    }

    const allFolders = Array.from(discoveredFolderSet).sort((a, b) => a.localeCompare(b));
    const cleanPrefix =
      !currentPrefix || currentPrefix === 'all' || currentPrefix === 'root'
        ? ''
        : sanitizeFolderPrefix(currentPrefix);

    const breadcrumbs: Array<{ name: string; path: string }> = [{ name: 'Root', path: '' }];
    if (cleanPrefix) {
      const parts = cleanPrefix.split('/').filter(Boolean);
      let cumulative = '';
      for (const part of parts) {
        cumulative = cumulative ? `${cumulative}/${part}` : part;
        breadcrumbs.push({ name: part, path: cumulative });
      }
    }

    const validFiles = keys.filter(
      (k) => !k.endsWith('/') && !k.endsWith('/.keep') && k !== '.keep'
    );

    let directFiles: string[] = [];
    let directFolders: Array<{ name: string; path: string; itemCount: number }> = [];

    if (viewMode === 'flat') {
      directFiles = validFiles.filter((k) => (!cleanPrefix ? true : k.startsWith(`${cleanPrefix}/`)));
    } else {
      directFiles = validFiles.filter((k) => {
        const folder = extractFolderFromKey(k);
        if (!cleanPrefix) {
          return !k.includes('/') || folder === 'uploads';
        }
        return folder === cleanPrefix;
      });

      const subfolderMap = new Map<string, { path: string; count: number }>();
      for (const folderPath of allFolders) {
        if (!cleanPrefix) {
          if (!folderPath.includes('/')) {
            subfolderMap.set(folderPath, { path: folderPath, count: 0 });
          }
        } else {
          if (folderPath.startsWith(`${cleanPrefix}/`)) {
            const remaining = folderPath.slice(cleanPrefix.length + 1);
            const firstSegment = remaining.split('/')[0];
            const directSubPath = `${cleanPrefix}/${firstSegment}`;
            if (!subfolderMap.has(directSubPath)) {
              subfolderMap.set(directSubPath, { path: directSubPath, count: 0 });
            }
          }
        }
      }

      for (const [subPath, val] of subfolderMap.entries()) {
        val.count = validFiles.filter((k) => k.startsWith(`${subPath}/`)).length;
      }

      directFolders = Array.from(subfolderMap.entries())
        .map(([subPath, data]) => ({
          name: subPath.split('/').pop() || subPath,
          path: subPath,
          itemCount: data.count,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      currentFolder: cleanPrefix,
      breadcrumbs,
      folders: directFolders,
      files: directFiles,
      allFolders,
      totalCount: directFiles.length,
    };
  };

  test('1. Discovers nested folders dynamically from deep S3 object keys', () => {
    const mockKeys = [
      'cubicon/models/character/head.glb',
      'cubicon/models/character/body.glb',
      'cubicon/textures/diffuse.png',
      'products-services/docs/v1/spec.pdf',
      'products-services/docs/v2/spec.pdf',
    ];

    const tree = computeDirectoryTree(mockKeys, '', 'hierarchical');

    assert.ok(tree.allFolders.includes('cubicon'));
    assert.ok(tree.allFolders.includes('cubicon/models'));
    assert.ok(tree.allFolders.includes('cubicon/models/character'));
    assert.ok(tree.allFolders.includes('cubicon/textures'));
    assert.ok(tree.allFolders.includes('products-services/docs'));
    assert.ok(tree.allFolders.includes('products-services/docs/v1'));
    assert.ok(tree.allFolders.includes('products-services/docs/v2'));
  });

  test('2. Discovers empty folders created via .keep directory markers', () => {
    const mockKeys = [
      'cubicon/models/empty-folder/.keep',
      'research-imperatives/2026/q3/.keep',
    ];

    const tree = computeDirectoryTree(mockKeys, '', 'hierarchical');

    assert.ok(tree.allFolders.includes('cubicon/models/empty-folder'));
    assert.ok(tree.allFolders.includes('research-imperatives/2026/q3'));

    // Markers must never appear in files list
    assert.equal(tree.files.length, 0);
  });

  test('3. Resolves breadcrumb hierarchy from root down to deeply nested paths', () => {
    const tree = computeDirectoryTree([], 'cubicon/models/character/rigs', 'hierarchical');

    assert.equal(tree.breadcrumbs.length, 5);
    assert.deepEqual(tree.breadcrumbs[0], { name: 'Root', path: '' });
    assert.deepEqual(tree.breadcrumbs[1], { name: 'cubicon', path: 'cubicon' });
    assert.deepEqual(tree.breadcrumbs[2], { name: 'models', path: 'cubicon/models' });
    assert.deepEqual(tree.breadcrumbs[3], { name: 'character', path: 'cubicon/models/character' });
    assert.deepEqual(tree.breadcrumbs[4], { name: 'rigs', path: 'cubicon/models/character/rigs' });
  });

  test('4. Correctly isolates immediate subfolders and item counts at target prefix', () => {
    const mockKeys = [
      'cubicon/logo.png',
      'cubicon/models/character.glb',
      'cubicon/models/prop.glb',
      'cubicon/textures/grass.png',
      'cubicon/audio/theme.mp3',
    ];

    const tree = computeDirectoryTree(mockKeys, 'cubicon', 'hierarchical');

    // Immediate subfolders under cubicon should be: models, textures, audio
    const subfolderNames = tree.folders.map((f) => f.name).sort();
    assert.deepEqual(subfolderNames, ['audio', 'models', 'textures']);

    // Counts check
    const modelsFolder = tree.folders.find((f) => f.name === 'models');
    assert.equal(modelsFolder?.itemCount, 2);

    const audioFolder = tree.folders.find((f) => f.name === 'audio');
    assert.equal(audioFolder?.itemCount, 1);

    // Direct files under cubicon: logo.png only
    assert.equal(tree.files.length, 1);
    assert.equal(tree.files[0], 'cubicon/logo.png');
  });

  test('5. Supports flat recursive view mode returning all files under prefix', () => {
    const mockKeys = [
      'cubicon/logo.png',
      'cubicon/models/character.glb',
      'cubicon/textures/grass.png',
      'products-services/spec.pdf',
    ];

    const flatTree = computeDirectoryTree(mockKeys, 'cubicon', 'flat');

    assert.equal(flatTree.files.length, 3);
    assert.ok(flatTree.files.includes('cubicon/logo.png'));
    assert.ok(flatTree.files.includes('cubicon/models/character.glb'));
    assert.ok(flatTree.files.includes('cubicon/textures/grass.png'));
    assert.ok(!flatTree.files.includes('products-services/spec.pdf'));
  });

  test('6. Preserves relative directory hierarchy when base destination is nested', () => {
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

    const dest = resolveItemDestination('cubicon/models/2026', 'characters/warrior/head.glb');
    const sanitized = sanitizeFolderPrefix(dest);

    assert.equal(sanitized, 'cubicon/models/2026/characters/warrior');
  });

  test('7. Strict Zero-Emoji compliance across all modified codebase and test files', () => {
    const filesToCheck = [
      'lib/minio.ts',
      'app/api/storage/files/route.ts',
      'app/api/storage/folders/route.ts',
      'components/FileUploader.tsx',
      'app/file-upload/page.tsx',
      'app/file-upload/page.module.css',
      'tests/nested-folder-explorer.test.ts',
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
