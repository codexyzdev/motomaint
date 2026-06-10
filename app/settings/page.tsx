import type { Metadata } from 'next';
import SettingsView from '@/components/settings/SettingsView';

export const metadata: Metadata = {
  title: 'Ajustes',
  description: 'Configura tu moto, servicios y preferencias de MotoMaint',
};

export default function SettingsPage() {
  return <SettingsView />;
}
