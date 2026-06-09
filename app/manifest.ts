import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MotoMaint',
    short_name: 'MotoMaint',
    description: 'Registra y rastrea el mantenimiento de tu motocicleta',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
