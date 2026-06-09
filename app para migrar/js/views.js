/**
 * ============================================================
 * Views — Pantallas / Vistas
 * ============================================================
 * Cada función renderiza una vista completa en #app.
 * Las vistas son funciones puras que reciben el router
 * y devuelven un nodo DOM.
 * ============================================================
 */

import { data } from './data.js';
import { computeServicesStatus, formatServiceStatus, getMainProgress } from './engine.js';
import { openModal, closeModal, confirm, toast, escapeHtml, formatDate, formatNumber, haptic } from './ui.js';
import { ICONS } from './icons.js';

// ============ ONBOARDING (primera vez) ============
export function renderOnboarding() {
  const wrap = document.createElement('div');
  wrap.className = 'onboarding';
  wrap.innerHTML = `
    <div class="onboarding-illu">
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
        <path d="M16 44l8-20h16l8 20" stroke="url(#og)" stroke-width="3" stroke-linejoin="round" fill="none"/>
        <circle cx="20" cy="46" r="6" stroke="url(#og)" stroke-width="3" fill="none"/>
        <circle cx="44" cy="46" r="6" stroke="url(#og)" stroke-width="3" fill="none"/>
        <path d="M24 24l4-8h8l4 8" stroke="url(#og)" stroke-width="3" stroke-linejoin="round" fill="none"/>
        <defs>
          <linearGradient id="og" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0" stop-color="#ff7a18"/>
            <stop offset="1" stop-color="#ffb347"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h1>Tu moto, <span>bien cuidada</span></h1>
    <p>Registra los mantenimientos y nunca más se te pase un cambio de aceite.</p>

    <form id="onboard-form">
      <div class="form-group">
        <label class="form-label" for="marca">Marca</label>
        <input class="form-input" type="text" id="marca" placeholder="Ej: Yamaha, Honda, Bajaj..." required autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label" for="modelo">Modelo</label>
        <input class="form-input" type="text" id="modelo" placeholder="Ej: FZ 250, CB 190R, Pulsar NS..." required autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label" for="km">Kilometraje actual</label>
        <input class="form-input" type="number" id="km" placeholder="Ej: 12500" required min="0" inputmode="numeric" />
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top: 12px;">
        Empezar <span style="font-size: 1.2rem;">→</span>
      </button>
    </form>
  `;

  wrap.querySelector('#onboard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const marca = wrap.querySelector('#marca').value.trim();
    const modelo = wrap.querySelector('#modelo').value.trim();
    const km = parseInt(wrap.querySelector('#km').value) || 0;

    if (!marca || !modelo) {
      toast('Marca y modelo son requeridos', 'danger');
      return;
    }

    await data.saveMoto({ marca, modelo, kmActual: km });
    haptic(15);
    toast('¡Moto registrada! 🏍️', 'success');
    setTimeout(() => location.reload(), 400);
  });

  return wrap;
}

// ============ DASHBOARD (principal) ============
export async function renderDashboard(router) {
  const moto = await data.getMoto();
  if (!moto) {
    router.go('onboarding');
    return document.createElement('div');
  }

  const services = await computeServicesStatus();
  const urgentCount = services.filter(s => s.status === 'urgent').length;
  const warningCount = services.filter(s => s.status === 'warning').length;

  const wrap = document.createElement('div');
  wrap.className = 'view';

  wrap.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Hola, piloto 🏁</h1>
      <button class="icon-btn" id="btn-settings" aria-label="Ajustes">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>

    <div class="moto-card" id="moto-card">
      <div class="moto-label">Tu moto</div>
      <h2 class="moto-name">
        <span>${escapeHtml(moto.marca)} ${escapeHtml(moto.modelo)}</span>
        <button id="edit-moto" aria-label="Editar moto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </h2>

      <div class="moto-label">Kilometraje actual</div>
      <div class="km-display">
        <span class="km-number" id="km-display">${formatNumber(moto.kmActual)}</span>
        <span class="km-unit">km</span>
      </div>
      <div class="km-actions">
        <button class="km-btn" data-km-delta="-100">−100</button>
        <button class="km-btn" data-km-delta="100">+100</button>
        <button class="km-btn" data-km-delta="500">+500</button>
        <button class="km-btn" id="km-edit">Editar</button>
      </div>
    </div>

    ${(urgentCount > 0 || warningCount > 0) ? `
      <div class="alert" style="background: ${urgentCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'}; border: 1px solid ${urgentCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 0.9rem; color: ${urgentCount > 0 ? '#fca5a5' : '#fbbf24'};">
        ${urgentCount > 0 ? `⚠️ ${urgentCount} servicio(s) vencido(s)` : `⏰ ${warningCount} servicio(s) por vencer pronto`}
      </div>
    ` : ''}

    <div class="tabs">
      <button class="tab active" data-tab="services">Servicios</button>
      <button class="tab" data-tab="history">Historial</button>
    </div>

    <div id="tab-services">
      <h3 class="section-title">Próximos mantenimientos</h3>
      <div id="services-list"></div>
    </div>

    <div id="tab-history" style="display: none;">
      <h3 class="section-title">Historial reciente</h3>
      <div id="history-list"></div>
    </div>

    <button class="fab" id="btn-add-record">
      <span style="font-size: 1.4rem;">+</span>
      <span class="fab-text">Registrar mantenimiento</span>
    </button>
  `;

  // --- Renderizar lista de servicios ---
  const servicesList = wrap.querySelector('#services-list');
  if (services.length === 0) {
    servicesList.innerHTML = `<div class="empty"><div class="empty-icon">🔧</div><p class="empty-text">No hay servicios configurados.<br>Ve a Ajustes para agregar.</p></div>`;
  } else {
    services.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'service-card';
      card.style.animation = `slideIn 0.4s var(--t) ${i * 0.05}s both`;
      const progress = getMainProgress(s);
      const fillClass = s.status === 'urgent' ? 'urgent' : s.status === 'warning' ? 'warning' : '';
      card.innerHTML = `
        <div class="service-icon">${s.icon}</div>
        <div class="service-info">
          <div class="service-name">${escapeHtml(s.name)}</div>
          <div class="service-status ${s.status}">${formatServiceStatus(s)}</div>
          <div class="progress-bar">
            <div class="progress-fill ${fillClass}" style="width: ${Math.min(100, progress * 100)}%"></div>
          </div>
        </div>
        <button class="service-check" data-service-id="${s.id}" aria-label="Marcar como hecho">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      `;
      // Click en la card abre detalle
      card.addEventListener('click', (e) => {
        if (e.target.closest('.service-check')) return;
        openServiceDetail(s, router);
      });
      // Click en el check abre el modal de registro
      card.querySelector('.service-check').addEventListener('click', (e) => {
        e.stopPropagation();
        openRecordModal(s, router);
      });
      servicesList.appendChild(card);
    });
  }

  // --- Renderizar historial ---
  const history = await data.getHistory();
  const historyList = wrap.querySelector('#history-list');
  if (history.length === 0) {
    historyList.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><p class="empty-text">Sin mantenimientos registrados aún.<br>¡Registra el primero!</p></div>`;
  } else {
    history.slice(0, 30).forEach((r, i) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.style.animation = `slideIn 0.4s var(--t) ${i * 0.03}s both`;
      item.innerHTML = `
        <div class="history-icon">${r.serviceIcon || '🔧'}</div>
        <div class="history-info">
          <div class="history-title">${escapeHtml(r.serviceName)}</div>
          <div class="history-meta">${formatNumber(r.km)} km · ${formatDate(r.date)}</div>
          ${r.notes ? `<div class="history-notes">${escapeHtml(r.notes)}</div>` : ''}
        </div>
        <button class="history-delete" data-record-id="${r.id}" aria-label="Eliminar">×</button>
      `;
      item.querySelector('.history-delete').addEventListener('click', async () => {
        const ok = await confirm({
          title: '¿Eliminar registro?',
          message: 'Esta acción no se puede deshacer.',
          confirmLabel: 'Eliminar',
          danger: true,
        });
        if (ok) {
          await data.removeRecord(r.id);
          haptic(10);
          toast('Registro eliminado');
          router.go('dashboard');
        }
      });
      historyList.appendChild(item);
    });
  }

  // --- Tabs ---
  wrap.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      wrap.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      wrap.querySelector('#tab-services').style.display = which === 'services' ? 'block' : 'none';
      wrap.querySelector('#tab-history').style.display = which === 'history' ? 'block' : 'none';
    });
  });

  // --- Km actions ---
  wrap.querySelectorAll('[data-km-delta]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const delta = parseInt(btn.dataset.kmDelta);
      const newKm = Math.max(0, moto.kmActual + delta);
      await data.updateKm(newKm);
      moto.kmActual = newKm;
      wrap.querySelector('#km-display').textContent = formatNumber(newKm);
      haptic(8);
      // Re-renderizar servicios por si cambian los estados
      setTimeout(() => router.go('dashboard'), 300);
    });
  });
  wrap.querySelector('#km-edit').addEventListener('click', () => openKmEditModal(moto, router));

  // --- Editar moto ---
  wrap.querySelector('#edit-moto').addEventListener('click', () => openMotoEditModal(moto, router));

  // --- Settings ---
  wrap.querySelector('#btn-settings').addEventListener('click', () => router.go('settings'));

  // --- FAB ---
  wrap.querySelector('#btn-add-record').addEventListener('click', () => openServicePickerModal(router));

  return wrap;
}

// ============ SETTINGS ============
export async function renderSettings(router) {
  const wrap = document.createElement('div');
  wrap.className = 'view';

  const [moto, services, settings] = await Promise.all([
    data.getMoto(),
    data.getServices(),
    data.getSettings(),
  ]);

  wrap.innerHTML = `
    <div class="view-header">
      <button class="icon-btn" id="btn-back" aria-label="Atrás">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="view-title">Ajustes</h1>
      <div style="width: 40px;"></div>
    </div>

    <h3 class="section-title">Tu moto</h3>
    <div class="service-type-row" id="row-moto">
      <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary-dim); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">🏍️</div>
      <div class="st-info">
        <div class="st-name">${escapeHtml(moto?.marca || '')} ${escapeHtml(moto?.modelo || '')}</div>
        <div class="st-interval">${formatNumber(moto?.kmActual || 0)} km · Editar marca, modelo o km</div>
      </div>
      <span style="color: var(--text-dim);">›</span>
    </div>

    <h3 class="section-title" style="margin-top: 28px;">Servicios configurados</h3>
    <div id="services-config-list"></div>
    <button class="btn btn-secondary" id="btn-add-service" style="margin-top: 8px;">+ Agregar servicio personalizado</button>

    <h3 class="section-title" style="margin-top: 28px;">Datos</h3>
    <button class="btn btn-secondary" id="btn-export" style="margin-bottom: 10px;">📤 Exportar respaldo (JSON)</button>
    <button class="btn btn-secondary" id="btn-import" style="margin-bottom: 10px;">📥 Importar respaldo</button>
    <input type="file" id="file-import" accept="application/json" style="display: none;" />
    <button class="btn btn-danger" id="btn-reset">🗑️ Borrar todo y empezar de cero</button>

    <div style="text-align: center; margin-top: 32px; color: var(--text-mute); font-size: 0.82rem;">
      MotoMaint v1.0 · Tus datos viven solo en este dispositivo
    </div>
  `;

  // Lista de servicios configurados
  const list = wrap.querySelector('#services-config-list');
  services.forEach(s => {
    const row = document.createElement('div');
    row.className = 'service-type-row';
    const intervalText = s.intervalKm
      ? `Cada ${formatNumber(s.intervalKm)} km`
      : s.intervalDays
        ? `Cada ${s.intervalDays} días`
        : 'Sin intervalo';
    row.innerHTML = `
      <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary-dim); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">${s.icon}</div>
      <div class="st-info">
        <div class="st-name">${escapeHtml(s.name)} ${!s.enabled ? '<span style="color: var(--text-mute); font-size: 0.8rem;">· desactivado</span>' : ''}</div>
        <div class="st-interval">${intervalText}</div>
      </div>
      <span style="color: var(--text-dim);">›</span>
    `;
    row.addEventListener('click', () => openServiceEditModal(s, router));
    list.appendChild(row);
  });

  // Acciones
  wrap.querySelector('#row-moto').addEventListener('click', () => openMotoEditModal(moto, router));
  wrap.querySelector('#btn-add-service').addEventListener('click', () => openServiceEditModal(null, router));
  wrap.querySelector('#btn-back').addEventListener('click', () => router.go('dashboard'));
  wrap.querySelector('#btn-export').addEventListener('click', exportData);
  wrap.querySelector('#btn-import').addEventListener('click', () => wrap.querySelector('#file-import').click());
  wrap.querySelector('#file-import').addEventListener('change', (e) => importData(e, router));
  wrap.querySelector('#btn-reset').addEventListener('click', async () => {
    const ok = await confirm({
      title: '¿Borrar todo?',
      message: 'Se eliminarán la moto, servicios e historial. Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, borrar todo',
      danger: true,
    });
    if (ok) {
      await data.reset();
      location.reload();
    }
  });

  return wrap;
}

// ============ MODALES ============

function openMotoEditModal(moto, router) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Marca</label>
      <input class="form-input" type="text" id="edit-marca" value="${escapeHtml(moto?.marca || '')}" />
    </div>
    <div class="form-group">
      <label class="form-label">Modelo</label>
      <input class="form-input" type="text" id="edit-modelo" value="${escapeHtml(moto?.modelo || '')}" />
    </div>
    <div class="form-group">
      <label class="form-label">Kilometraje actual</label>
      <input class="form-input" type="number" id="edit-km" value="${moto?.kmActual || 0}" min="0" inputmode="numeric" />
    </div>
  `;
  openModal({
    title: 'Editar moto',
    subtitle: 'Actualiza los datos de tu moto',
    body,
    actions: [
      { label: 'Cancelar', variant: 'btn-secondary' },
      { label: 'Guardar', variant: 'btn-primary', onClick: async () => {
        const marca = body.querySelector('#edit-marca').value.trim();
        const modelo = body.querySelector('#edit-modelo').value.trim();
        const km = parseInt(body.querySelector('#edit-km').value) || 0;
        if (!marca || !modelo) { toast('Marca y modelo requeridos', 'danger'); return false; }
        await data.saveMoto({ marca, modelo, kmActual: km });
        toast('Moto actualizada ✓', 'success');
        router.go('dashboard');
      }},
    ],
  });
}

function openKmEditModal(moto, router) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Kilometraje actual</label>
      <input class="form-input" type="number" id="edit-km-now" value="${moto.kmActual || 0}" min="0" inputmode="numeric" autofocus />
      <p style="font-size: 0.82rem; color: var(--text-dim); margin-top: 8px; padding-left: 4px;">Tip: usa los botones ± para ajustes rápidos</p>
    </div>
  `;
  openModal({
    title: 'Actualizar kilometraje',
    body,
    actions: [
      { label: 'Cancelar', variant: 'btn-secondary' },
      { label: 'Guardar', variant: 'btn-primary', onClick: async () => {
        const km = parseInt(body.querySelector('#edit-km-now').value) || 0;
        await data.updateKm(km);
        toast('Kilometraje actualizado ✓', 'success');
        router.go('dashboard');
      }},
    ],
  });
}

function openServicePickerModal(router) {
  const services = computeServicesStatus().then(services => {
    const body = document.createElement('div');
    if (services.length === 0) {
      body.innerHTML = `<p class="empty-text">No hay servicios activos. Ve a Ajustes para agregar.</p>`;
      openModal({ title: 'Registrar mantenimiento', body, actions: [{ label: 'Cerrar', variant: 'btn-secondary' }] });
      return;
    }
    body.innerHTML = `<p style="color: var(--text-dim); margin: 0 0 14px;">¿Qué servicio realizaste?</p>`;
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
    services.forEach(s => {
      const btn = document.createElement('button');
      btn.style.cssText = 'background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; color: var(--text); font-family: inherit; text-align: left;';
      btn.innerHTML = `
        <div style="font-size: 1.6rem; margin-bottom: 6px;">${s.icon}</div>
        <div style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(s.name)}</div>
        <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 2px;">${formatServiceStatus(s)}</div>
      `;
      btn.onclick = () => { closeModal(); openRecordModal(s, router); };
      grid.appendChild(btn);
    });
    body.appendChild(grid);
    openModal({ title: 'Registrar mantenimiento', body, actions: [{ label: 'Cancelar', variant: 'btn-secondary' }] });
  });
}

async function openRecordModal(service, router) {
  const moto = await data.getMoto();
  const body = document.createElement('div');
  body.innerHTML = `
    <div style="text-align: center; padding: 8px 0 16px;">
      <div style="font-size: 3rem;">${service.icon}</div>
      <div style="font-weight: 600; margin-top: 6px;">${escapeHtml(service.name)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Kilometraje al momento del servicio</label>
      <input class="form-input" type="number" id="rec-km" value="${moto?.kmActual || 0}" min="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label class="form-label">Notas (opcional)</label>
      <textarea class="form-textarea" id="rec-notes" placeholder="Ej: aceite Motul 5100, próximo cambio..."></textarea>
    </div>
  `;
  openModal({
    title: 'Registrar servicio',
    body,
    actions: [
      { label: 'Cancelar', variant: 'btn-secondary' },
      { label: 'Registrar ✓', variant: 'btn-primary', onClick: async () => {
        const km = parseInt(body.querySelector('#rec-km').value) || 0;
        const notes = body.querySelector('#rec-notes').value.trim();
        await data.addRecord({
          serviceId: service.id,
          serviceName: service.name,
          serviceIcon: service.icon,
          km,
          notes,
        });
        // Actualizar el km de la moto al del servicio si es mayor
        if (moto && km > moto.kmActual) {
          await data.updateKm(km);
        }
        haptic(20);
        toast(`¡${service.name} registrado! 🎉`, 'success');
        router.go('dashboard');
      }},
    ],
  });
}

function openServiceEditModal(service, router) {
  const isNew = !service;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Nombre</label>
      <input class="form-input" type="text" id="svc-name" value="${escapeHtml(service?.name || '')}" placeholder="Ej: Cambio de aceite" />
    </div>
    <div class="form-group">
      <label class="form-label">Icono</label>
      <div class="icon-picker" id="icon-picker"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Cada cuántos km</label>
        <input class="form-input" type="number" id="svc-km" value="${service?.intervalKm || ''}" placeholder="Ej: 3000" min="0" inputmode="numeric" />
      </div>
      <div class="form-group">
        <label class="form-label">Cada cuántos días</label>
        <input class="form-input" type="number" id="svc-days" value="${service?.intervalDays || ''}" placeholder="Ej: 7" min="0" inputmode="numeric" />
      </div>
    </div>
    <p style="font-size: 0.82rem; color: var(--text-dim); margin-top: -8px;">Deja vacío el intervalo que no aplique. Si dejas ambos vacíos, el servicio no tendrá recordatorio.</p>
    ${!isNew ? `
      <div class="form-group" style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="btn btn-secondary" id="svc-toggle" style="flex: 1;">${service.enabled ? 'Desactivar' : 'Activar'}</button>
        <button class="btn btn-danger" id="svc-delete" style="flex: 1;">Eliminar</button>
      </div>
    ` : ''}
  `;

  openModal({
    title: isNew ? 'Nuevo servicio' : 'Editar servicio',
    body,
    actions: [
      { label: 'Cancelar', variant: 'btn-secondary' },
      { label: 'Guardar', variant: 'btn-primary', onClick: async () => {
        const name = body.querySelector('#svc-name').value.trim();
        const icon = body.querySelector('.icon-option.selected')?.dataset.icon || '🔧';
        const intervalKm = parseInt(body.querySelector('#svc-km').value) || null;
        const intervalDays = parseInt(body.querySelector('#svc-days').value) || null;
        if (!name) { toast('El nombre es requerido', 'danger'); return false; }

        if (isNew) {
          await data.addService({ name, icon, intervalKm, intervalDays, enabled: true });
          toast('Servicio agregado ✓', 'success');
        } else {
          await data.updateService(service.id, { name, icon, intervalKm, intervalDays });
          toast('Servicio actualizado ✓', 'success');
        }
        router.go('settings');
      }},
    ],
  });

  // Icon picker
  const picker = body.querySelector('#icon-picker');
  let selectedIcon = service?.icon || '🔧';
  ICONS.forEach(icon => {
    const opt = document.createElement('button');
    opt.className = 'icon-option' + (icon === selectedIcon ? ' selected' : '');
    opt.dataset.icon = icon;
    opt.textContent = icon;
    opt.type = 'button';
    opt.onclick = () => {
      picker.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedIcon = icon;
    };
    picker.appendChild(opt);
  });

  // Acciones extra
  if (!isNew) {
    body.querySelector('#svc-toggle').onclick = async (e) => {
      e.preventDefault();
      await data.updateService(service.id, { enabled: !service.enabled });
      closeModal();
      router.go('settings');
    };
    body.querySelector('#svc-delete').onclick = async (e) => {
      e.preventDefault();
      const ok = await confirm({
        title: '¿Eliminar servicio?',
        message: `Se eliminará "${service.name}" y todos sus registros del historial.`,
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (ok) {
        await data.removeService(service.id);
        toast('Servicio eliminado');
        router.go('settings');
      } else {
        closeModal();
      }
    };
  }
}

function openServiceDetail(service, router) {
  const body = document.createElement('div');
  const lastText = service.lastRecord
    ? `Última vez: a los ${formatNumber(service.lastRecord.km)} km · ${formatDate(service.lastRecord.date)}`
    : 'Aún no has registrado este servicio';
  body.innerHTML = `
    <div style="text-align: center; padding: 8px 0 16px;">
      <div style="font-size: 3rem;">${service.icon}</div>
      <div style="font-weight: 600; margin-top: 6px; font-size: 1.1rem;">${escapeHtml(service.name)}</div>
      <div style="color: var(--text-dim); font-size: 0.9rem; margin-top: 4px;">${lastText}</div>
    </div>
    <div class="form-group" style="background: var(--bg-elev-2); padding: 14px; border-radius: 10px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span style="color: var(--text-dim); font-size: 0.88rem;">Intervalo</span>
        <span style="font-weight: 600;">
          ${service.intervalKm ? `Cada ${formatNumber(service.intervalKm)} km` : ''}
          ${service.intervalKm && service.intervalDays ? ' · ' : ''}
          ${service.intervalDays ? `Cada ${service.intervalDays} días` : ''}
          ${!service.intervalKm && !service.intervalDays ? 'Sin intervalo' : ''}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-dim); font-size: 0.88rem;">Estado</span>
        <span style="font-weight: 600; color: ${service.status === 'urgent' ? 'var(--danger)' : service.status === 'warning' ? 'var(--warning)' : 'var(--success)'};">
          ${formatServiceStatus(service)}
        </span>
      </div>
    </div>
  `;
  openModal({
    title: service.name,
    body,
    actions: [
      { label: 'Cerrar', variant: 'btn-secondary' },
      { label: 'Registrar ahora ✓', variant: 'btn-primary', onClick: () => openRecordModal(service, router) },
    ],
  });
}

// ============ EXPORT / IMPORT ============
async function exportData() {
  const dump = await data.exportAll();
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `motomaint-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Respaldo descargado 📤', 'success');
}

async function importData(e, router) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    await data.importAll(payload);
    toast('Respaldo restaurado ✓', 'success');
    setTimeout(() => router.go('dashboard'), 600);
  } catch (err) {
    toast('Archivo inválido', 'danger');
    console.error(err);
  }
  e.target.value = '';
}
