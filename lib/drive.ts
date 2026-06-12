import type { BackupPayload } from './types';

interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

const FILE_NAME = 'motomaint-backup.json';

export async function findDataFile(token: string): Promise<DriveFile | null> {
    if (!token) throw new Error('No hay token de acceso');

    const params = new URLSearchParams({
        q: `name='${FILE_NAME}' and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
        spaces: 'drive'
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        if (res.status === 401) {
            throw new Error('AUTH_EXPIRED');
        }
        throw new Error('Error al buscar el archivo en Drive');
    }

    const data = await res.json();
    return data.files?.[0] || null;
}

export async function downloadFile(fileId: string, token: string): Promise<BackupPayload> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Error al descargar el archivo de Drive');
    return await res.json();
}

export async function uploadFile(fileId: string | null, content: BackupPayload, token: string): Promise<DriveFile> {
    if (fileId) {
        const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });
        if (!res.ok) throw new Error('Error al actualizar el archivo en Drive');
        return await res.json();
    } else {
        const metadata = {
            name: FILE_NAME,
            mimeType: 'application/json',
            description: 'Backup de MotoMaint'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

        const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form
        });
        if (!res.ok) throw new Error('Error al crear el archivo en Drive');
        return await res.json();
    }
}