import {resourceImage as baselineImage} from '../source-baseline/nepocore-library/lib/resource-images';
import {illustrationDataUrl} from '../source-baseline/nepocore-library/lib/illustrations';
import previews from '../data/preview-resources.json';
const previewIds=new Set(previews.map(r=>r.id));
import type {Resource} from '../source-baseline/nepocore-library/lib/types';

// Only the small, explicit staging sample is generated as static artwork.
// These are conceptual illustrations, never represented as provider screenshots.
export function resourceImage(resource:Resource) {
  const image=baselineImage(resource);
  return image.src.startsWith('/illustrations?')
    ? {...image,src:previewIds.has(resource.id)?'/previews/atlas-'+resource.id+'.svg':illustrationDataUrl(resource)}
    : image;
}
