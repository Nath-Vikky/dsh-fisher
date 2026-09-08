export function thumbnailAsset(filename:string):string {
  return filename.endsWith('.webp')?filename.replace(/\.webp$/,'-thumb.webp'):filename;
}
export function imageContentType(filename:string):'image/png'|'image/webp' {
  return filename.endsWith('.webp')?'image/webp':'image/png';
}
