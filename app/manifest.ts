import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MotoMaint',
    short_name: 'MotoMaint',
    description: 'Registra y rastrea el mantenimiento de tu motocicleta',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c1118',
    theme_color: '#0c1118',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
