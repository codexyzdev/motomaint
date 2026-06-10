import { getValidAccessToken, clearTokens } from './googleAuth';
import type { BackupPayload } from './types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FILE_NAME = 'motomaint-backup.json';
const FOLDER_NAME = 'MotoMaint';
const MIME_TYPE = 'application/json';

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

interface DriveListResponse {
  files: DriveFile[];
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

async function findOrCreateFolder(): Promise<string> {
  const headers = await getHeaders();

  const searchResponse = await fetch(
    `${DRIVE_API}/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers }
  );

  if (!searchResponse.ok) {
    throw new Error('Failed to search for folder');
  }

  const result: DriveListResponse = await searchResponse.json();

  if (result.files && result.files.length > 0) {
    return result.files[0].id;
  }

  const createResponse = await fetch(
    `${DRIVE_API}/files`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!createResponse.ok) {
    throw new Error('Failed to create folder');
  }

  const folder = await createResponse.json();
  return folder.id;
}

async function findBackupFile(folderId: string): Promise<DriveFile | null> {
  const headers = await getHeaders();

  const response = await fetch(
    `${DRIVE_API}/files?q=name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`,
    { headers }
  );

  if (!response.ok) {
    throw new Error('Failed to search for backup file');
  }

  const result: DriveListResponse = await response.json();
  return result.files && result.files.length > 0 ? result.files[0] : null;
}

export async function uploadBackup(data: BackupPayload): Promise<{ success: boolean; fileId?: string; modifiedTime?: string }> {
  try {
    const folderId = await findOrCreateFolder();
    const existingFile = await findBackupFile(folderId);

    const jsonData = JSON.stringify(data, null, 2);
    const headers = await getHeaders();

    if (existingFile) {
      const response = await fetch(
        `${DRIVE_UPLOAD_API}/files/${existingFile.id}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': MIME_TYPE,
          },
          body: jsonData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update backup file');
      }

      const result = await response.json();
      return { success: true, fileId: result.id, modifiedTime: result.modifiedTime };
    } else {
      const metadata = {
        name: FILE_NAME,
        parents: [folderId],
      };

      const response = await fetch(
        `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'multipart/related; boundary=boundary',
          },
          body: [
            '--boundary',
            'Content-Type: application/json',
            '',
            JSON.stringify(metadata),
            '',
            '--boundary',
            `Content-Type: ${MIME_TYPE}`,
            '',
            jsonData,
            '--boundary--',
          ].join('\r\n'),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create backup file');
      }

      const result = await response.json();
      return { success: true, fileId: result.id, modifiedTime: result.modifiedTime };
    }
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      clearTokens();
    }
    throw error;
  }
}

export async function downloadBackup(): Promise<BackupPayload | null> {
  try {
    const folderId = await findOrCreateFolder();
    const file = await findBackupFile(folderId);

    if (!file) {
      return null;
    }

    const headers = await getHeaders();

    const response = await fetch(
      `${DRIVE_API}/files/${file.id}?alt=media`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Failed to download backup');
    }

    const data = await response.json();
    return data as BackupPayload;
  } catch (error) {
    console.error('Download error:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      clearTokens();
    }
    throw error;
  }
}

export async function getLastBackupInfo(): Promise<{ modifiedTime: string } | null> {
  try {
    const folderId = await findOrCreateFolder();
    const file = await findBackupFile(folderId);
    return file ? { modifiedTime: file.modifiedTime } : null;
  } catch {
    return null;
  }
}