import { Directory, File, Paths } from 'expo-file-system';

const UPLOADS_SUBDIR = 'uploads';

/**
 * Returns the path of the persistent uploads directory under the document directory.
 * The document directory survives cache purges; pictures live there until upload completes.
 */
export function getUploadsDirectoryUri(): string {
  return `${Paths.document.uri}${UPLOADS_SUBDIR}/`;
}

/** Ensures the uploads/ subdirectory exists; idempotent. */
export function ensureUploadsDirectory(): void {
  const dir = new Directory(Paths.document, UPLOADS_SUBDIR);
  if (!dir.exists) dir.create({ intermediates: true });
}

/**
 * Copies the given source URI into our persistent uploads directory and
 * returns the new URI.
 */
export function copyToUploadsDir(sourceUri: string, id: string): string {
  ensureUploadsDirectory();
  const ext = inferExtension(sourceUri) ?? 'jpg';
  const dest = new File(`${getUploadsDirectoryUri()}${id}.${ext}`);
  if (dest.exists) dest.delete();
  const src = new File(sourceUri);
  src.copy(dest);
  return dest.uri;
}

/** Best-effort delete; swallows errors so cleanup never blocks the caller. */
export function deleteLocalFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* noop */
  }
}

function inferExtension(uri: string): string | undefined {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/u);
  return match?.[1]?.toLowerCase();
}
