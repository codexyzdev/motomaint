/**
 * ============================================================
 * UI — Componentes de interfaz reutilizables
 * ============================================================
 * Modal, toast, helpers de DOM. Todo lo visual de bajo nivel.
 * ============================================================
 */

// ============ TOAST ============
let toastTimer = null;
export function toast(message, type = 'default', duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (type !== 'default' ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, duration);
}

// ============ MODAL ============
let activeModalClose = null;

export function openModal({ title, subtitle, body, actions, onClose }) {
  closeModal(); // cierra cualquier modal activo

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-handle"></div>
      <h2>${escapeHtml(title)}</h2>
      ${subtitle ? `<p class="modal-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      <div class="modal-body"></div>
    </div>
  `;

  const modalEl = backdrop.querySelector('.modal');
  const bodyEl = backdrop.querySelector('.modal-body');

  // Inyectar contenido del body
  if (typeof body === 'string') {
    bodyEl.innerHTML = body;
  } else if (body instanceof HTMLElement) {
    bodyEl.appendChild(body);
  }

  // Acciones
  if (actions && actions.length) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'modal-actions';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = `btn ${a.variant || 'btn-secondary'}`;
      btn.textContent = a.label;
      btn.onclick = async (e) => {
        e.preventDefault();
        if (a.onClick) {
          const result = await a.onClick(bodyEl);
          if (result !== false) closeModal();
        } else {
          closeModal();
        }
      };
      actionsEl.appendChild(btn);
    });
    bodyEl.appendChild(actionsEl);
  }

  // Cerrar al tocar el backdrop (no el modal)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  document.body.appendChild(backdrop);
  activeModalClose = onClose;

  // Prevenir scroll del body
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.style.animation = 'fadeIn 0.2s var(--t) reverse';
    setTimeout(() => backdrop.remove(), 180);
  }
  document.body.style.overflow = '';
  if (activeModalClose) {
    try { activeModalClose(); } catch (e) { console.error(e); }
    activeModalClose = null;
  }
}

// ============ CONFIRM ============
export function confirm({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    openModal({
      title,
      subtitle: message,
      actions: [
        { label: cancelLabel, variant: 'btn-secondary', onClick: () => resolve(false) },
        { label: confirmLabel, variant: danger ? 'btn-danger' : 'btn-primary', onClick: () => resolve(true) },
      ],
    });
  });
}

// ============ HELPERS ============
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString('es-CO');
}

// ============ HAPTIC FEEDBACK (si está disponible) ============
export function haptic(pattern = 10) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }
}
