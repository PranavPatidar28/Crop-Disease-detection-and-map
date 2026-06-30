import { readdirSync, statSync } from 'fs';
import { join } from 'path';

import { CROP_DISEASE_CATALOG, getCatalogEntry } from './crop-disease-catalog';

// repo-root/crop-images, 5 levels up from this file's directory
const CROP_IMAGES_DIR = join(__dirname, '../../../../../crop-images');

function listFolderPairs(): Array<{ crop: string; disease: string }> {
  const pairs: Array<{ crop: string; disease: string }> = [];
  for (const crop of readdirSync(CROP_IMAGES_DIR)) {
    const cropPath = join(CROP_IMAGES_DIR, crop);
    if (!statSync(cropPath).isDirectory()) continue;
    for (const disease of readdirSync(cropPath)) {
      if (!statSync(join(cropPath, disease)).isDirectory()) continue;
      pairs.push({ crop, disease });
    }
  }
  return pairs;
}

describe('crop-disease catalog', () => {
  const pairs = listFolderPairs();

  it('discovers crop/disease folders on disk', () => {
    expect(pairs.length).toBeGreaterThan(60);
  });

  it.each(pairs)('has an entry for $crop/$disease', ({ crop, disease }) => {
    const entry = getCatalogEntry(crop, disease);
    expect(entry).toBeDefined();
    expect(entry!.displayName.length).toBeGreaterThan(0);
    expect(entry!.recommendations.length).toBeGreaterThan(0);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(entry!.defaultSeverity);
  });

  it('exposes a catalog keyed by crop', () => {
    expect(Object.keys(CROP_DISEASE_CATALOG).length).toBeGreaterThanOrEqual(15);
  });
});
