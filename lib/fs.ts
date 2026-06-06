export function formatFileName(
  filePath: string | undefined
): string | undefined {
  if (!filePath) return undefined;
  return filePath.split("/").pop()?.trim();
}
