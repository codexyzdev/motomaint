/**
 * ============================================================
 * App — Entry point + Router
 * ============================================================
 * Decide qué vista mostrar según el estado (hay moto o no)
 * y monta/desmonta vistas limpiamente.
 * ============================================================
 */

import { data } from './data.js';
import { renderOnboarding, renderDashboard, renderSettings } from './views.js';
import { closeModal } from './ui.js';

const router = {
  current: null,

  async go(view, params = {}) {
    const app = document.getElementById('app');
    // Limpiar vista actual
    app.innerHTML = '';
    closeModal();

    let viewEl;
    switch (view) {
      case 'onboarding':
        viewEl = renderOnboarding(params);
        break;
      case 'dashboard':
        viewEl = await renderDashboard(this);
        break;
      case 'settings':
        viewEl = await renderSettings(this);
        break;
      default:
        viewEl = await renderDashboard(this);
    }

    if (viewEl) app.appendChild(viewEl);
    this.current = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
};

async function bootstrap() {
  // Decidir vista inicial
  const moto = await data.getMoto();
  await new Promise(r => setTimeout(r, 700)); // pequeño delay para que se vea el splash
  if (!moto) {
    router.go('onboarding');
  } else {
    router.go('dashboard');
  }
}

bootstrap();

// Exponer router para debugging en consola
window.__motomaint = { router, data };
