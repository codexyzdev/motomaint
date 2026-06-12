import { getValidAccessToken, getValidAccessTokenWithRefresh, clearAccessToken } from './googleAuth';
import type { BackupPayload } from './types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FILE_NAME = 'motomaint-backup.json';
const FILE_ID_KEY = 'motomaint:backup_file_id';

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

interface DriveListResponse {
  files: DriveFile[];
}

function getStoredFileId(): string | null {
  try { return localStorage.getItem(FILE_ID_KEY); } catch { return null; }
}

function storeFileId(id: string): void {
  try { localStorage.setItem(FILE_ID_KEY, id); } catch { }
}

function clearStoredFileId(): void {
  try { localStorage.removeItem(FILE_ID_KEY); } catch { }
}

async function getHeaders(): Promise<HeadersInit> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

function driveQuery(q: string): string {
  const params = new URLSearchParams({ q });
  return `${DRIVE_API}/files?${params.toString()}`;
}

async function fetchWithToken(url: string, options: RequestInit): Promise<Response> {
  let headers = await getHeaders();
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    const newToken = await getValidAccessTokenWithRefresh();
    if (newToken) {
      response = await fetch(url, { ...options, headers: { ...headers, 'Authorization': `Bearer ${newToken}` } });
    } else {
      clearAccessToken();
      throw new Error('Token expired and refresh failed');
    }
  }
  return response;
}

async function searchFiles(q: string): Promise<DriveFile[]> {
  const response = await fetchWithToken(driveQuery(q), {});
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive API search failed (${response.status}): ${text}`);
  }
  const result: DriveListResponse = await response.json();
  return result.files ?? [];
}

async function fetchFileById(fileId: string): Promise<Response> {
  return fetchWithToken(`${DRIVE_API}/files/${fileId}?alt=media`, {});
}

async function fetchFileMetadata(fileId: string): Promise<DriveFile | null> {
  const response = await fetchWithToken(`${DRIVE_API}/files/${fileId}?fields=id,name,modifiedTime`, {});
  if (!response.ok) return null;
  return response.json();
}

export async function findOrCreateFolder(): Promise<string> {
  const existing = await searchFiles(
    `name='MotoMaint' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  if (existing.length > 0) return existing[0].id;

  const createResponse = await fetchWithToken(`${DRIVE_API}/files`, {
    method: 'POST',
    body: JSON.stringify({ name: 'MotoMaint', mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!createResponse.ok) throw new Error('Failed to create folder');
  const folder = await createResponse.json();
  return folder.id;
}

export async function uploadBackup(data: BackupPayload): Promise<{ success: boolean; fileId?: string; modifiedTime?: string }> {
  try {
    const folderId = await findOrCreateFolder();
    const existingFile = await searchFiles(
      `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`
    ).then(files => files[0] ?? null);
    const jsonData = JSON.stringify(data, null, 2);

    let fileId: string;

    if (existingFile) {
      const response = await fetchWithToken(`${DRIVE_UPLOAD_API}/files/${existingFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: jsonData,
      });
      if (!response.ok) throw new Error('Failed to update backup file');
      const result = await response.json();
      fileId = result.id;
    } else {
      const metadata = { name: FILE_NAME, parents: [folderId] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonData], { type: 'application/json' }));

      const token = await getValidAccessToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create backup file: ${text}`);
      }
      const result = await response.json();
      fileId = result.id;
    }

    storeFileId(fileId);
    return { success: true, fileId };
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') {
      clearAccessToken();
    }
    throw error;
  }
}

export async function downloadBackup(): Promise<BackupPayload | null> {
  // Try stored fileId first (fast path, no search needed)
  const storedId = getStoredFileId();
  if (storedId) {
    const meta = await fetchFileMetadata(storedId);
    if (meta) {
      const response = await fetchFileById(storedId);
      if (response.ok) return (await response.json()) as BackupPayload;
    }
    clearStoredFileId();
  }

  // Fallback: search by filename across all of Drive (drive.file scope)
  const files = await searchFiles(`name='${FILE_NAME}' and trashed=false`);
  if (files.length === 0) return null;

  const file = files.sort(
    (a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
  )[0];

  storeFileId(file.id);
  const response = await fetchFileById(file.id);
  if (!response.ok) throw new Error('Failed to download backup');
  return (await response.json()) as BackupPayload;
}

export async function getLastBackupInfo(): Promise<{ modifiedTime: string } | null> {
  try {
    const storedId = getStoredFileId();
    if (storedId) {
      const meta = await fetchFileMetadata(storedId);
      if (meta) return { modifiedTime: meta.modifiedTime };
    }
    const files = await searchFiles(`name='${FILE_NAME}' and trashed=false`);
    if (files.length === 0) return null;
    const file = files.sort(
      (a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
    )[0];
    storeFileId(file.id);
    return { modifiedTime: file.modifiedTime };
  } catch {
    return null;
  }
}

export { clearAccessToken };