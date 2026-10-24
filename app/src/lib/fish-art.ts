// Keep silhouette conversion separate from rendering so fills, strokes, and
// clipping can be checked against every illustration in the collection.
export function fishSilhouette(xml: string) {
  return xml.replace(/\b(fill|stroke)="(?!none")[^"]*"/g, '$1="#101010"')
    .replace(/\s(?:opacity|fill-opacity|stroke-opacity)="[^"]*"/g, '');
}

export function namespaceFishSvg(xml: string, instanceId: string) {
  const prefix = `fish-${instanceId.replace(/[^a-zA-Z0-9_-]/g, '')}-`;
  return xml.replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${prefix}${id})`);
}
