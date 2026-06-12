'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { findDataFile, downloadFile } from '@/lib/drive';
import { data } from '@/lib/data';
import { emitDataChanged } from '@/lib/dataEvents';

interface DriveSyncBootstrapProps {
  children: React.ReactNode;
}

export function DriveSyncBootstrap({ children }: DriveSyncBootstrapProps) {
  const { data: session, status } = useSession();
  const [hasRestored, setHasRestored] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isAuthenticated = status === 'authenticated';
  const accessToken = session?.accessToken as string | undefined;

  useEffect(() => {
    if (isAuthenticated && accessToken && !hasRestored && !isRestoring) {
      setIsRestoring(true);
      
      const restoreFromDrive = async () => {
        try {
          const file = await findDataFile(accessToken);
          
          if (file) {
            console.log('📂 DriveSyncBootstrap: Archivo encontrado, descargando...');
            const cloudData = await downloadFile(file.id, accessToken);
            await data.importAll(cloudData);
            emitDataChanged();
            console.log('✅ DriveSyncBootstrap: Datos restaurados de Drive');
          } else {
            console.log('🆕 DriveSyncBootstrap: No existe archivo en Drive');
          }
        } catch (error) {
          console.error('DriveSyncBootstrap error:', error);
        } finally {
          setIsRestoring(false);
          setHasRestored(true);
        }
      };

      restoreFromDrive();
    }

    if (!isAuthenticated) {
      setHasRestored(false);
    }
  }, [isAuthenticated, accessToken, hasRestored, isRestoring]);

  return <>{children}</>;
}