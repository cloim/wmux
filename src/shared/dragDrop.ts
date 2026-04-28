type DragTypeList = ArrayLike<string> & Iterable<string>;

export function isFileDrag(dataTransfer: { types?: DragTypeList | null } | null | undefined): boolean {
  if (!dataTransfer?.types) return false;
  return Array.from(dataTransfer.types).includes('Files');
}
