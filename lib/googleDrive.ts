import { getValidAccessToken, getValidAccessTokenWithRefresh, clearAccessToken } from './googleAuth';
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

async function fetchWithAuthRetry(url: string, options: RequestInit): Promise<Response> {
  let headers = await getHeaders();
  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const newToken = await getValidAccessTokenWithRefresh();
    if (newToken) {
      headers = { ...options.headers as Record<string, string>, 'Authorization': `Bearer ${newToken}` };
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

export async function findOrCreateFolder(): Promise<string> {
  let headers = await getHeaders();

  let searchResponse = await fetch(
    `${DRIVE_API}/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers }
  );

  if (searchResponse.status === 401) {
    const newToken = await getValidAccessTokenWithRefresh();
    if (newToken) {
      headers = { ...headers, 'Authorization': `Bearer ${newToken}` };
      searchResponse = await fetch(
        `${DRIVE_API}/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers }
      );
    }
  }

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

export async function findBackupFile(folderId: string): Promise<DriveFile | null> {
  let headers = await getHeaders();

  let response = await fetch(
    `${DRIVE_API}/files?q=name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`,
    { headers }
  );

  if (response.status === 401) {
    const newToken = await getValidAccessTokenWithRefresh();
    if (newToken) {
      headers = { ...headers, 'Authorization': `Bearer ${newToken}` };
      response = await fetch(
        `${DRIVE_API}/files?q=name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`,
        { headers }
      );
    }
  }

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
    let headers = await getHeaders();

    if (existingFile) {
      let response = await fetch(
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

      if (response.status === 401) {
        const newToken = await getValidAccessTokenWithRefresh();
        if (newToken) {
          headers = { ...headers, 'Authorization': `Bearer ${newToken}` };
          response = await fetch(
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
        }
      }

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

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonData], { type: MIME_TYPE }));

      let response = await fetch(
        `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await getValidAccessToken())}`,
          },
          body: form,
        }
      );

      if (response.status === 401) {
        const newToken = await getValidAccessTokenWithRefresh();
        if (newToken) {
          response = await fetch(
            `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${newToken}`,
              },
              body: form,
            }
          );
        }
      }

      if (!response.ok) {
        const text = await response.text();
        console.error('Failed to create backup file:', text);
        throw new Error('Failed to create backup file');
      }

      const result = await response.json();
      return { success: true, fileId: result.id, modifiedTime: result.modifiedTime };
    }
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      clearAccessToken();
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

    let headers = await getHeaders();

    let response = await fetch(
      `${DRIVE_API}/files/${file.id}?alt=media`,
      { headers }
    );

    if (response.status === 401) {
      const newToken = await getValidAccessTokenWithRefresh();
      if (newToken) {
        headers = { ...headers, 'Authorization': `Bearer ${newToken}` };
        response = await fetch(
          `${DRIVE_API}/files/${file.id}?alt=media`,
          { headers }
        );
      }
    }

    if (!response.ok) {
      throw new Error('Failed to download backup');
    }

    const data = await response.json();
    return data as BackupPayload;
  } catch (error) {
    console.error('Download error:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      clearAccessToken();
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