// ============================================
// auth.js — módulo compartido de autenticación
// Incluir en todas las páginas protegidas
// ============================================

const SUPA_URL='https://kjexzywygtzuxtzlberb.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXh6eXd5Z3R6dXh0emxiZXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MzYwNDIsImV4cCI6MjA5NjIxMjA0Mn0.lCzyRGTG-yXMUIM5MeBuR_VPGvCuVQYRUp8R1QibxiI';

// Singleton de Supabase — se reutiliza en todas las páginas
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

// Perfil del usuario actual en memoria
let currentUser = null;  // { id, email, nombre, rol }

// Permisos por rol
const PERMISOS = {
  propietario: {
    crear: true, completar: true, mensajeria: true,
    editor: true, finanzas: true, usuarios: true
  },
  administrador: {
    crear: true, completar: true, mensajeria: true,
    editor: true, finanzas: false, usuarios: false
  },
  operador: {
    crear: true, completar: false, mensajeria: false,
    editor: false, finanzas: false, usuarios: false
  }
};

function can(permiso) {
  if (!currentUser) return false;
  return PERMISOS[currentUser.rol]?.[permiso] || false;
}

// Inicializar auth — llamar al cargar cada página
// requiredRol: 'propietario' | 'administrador' | null (cualquier usuario logueado)
async function initAuth(requiredPermiso = null) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  // Cargar perfil
  const { data: perfil } = await sb.from('perfiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!perfil || !perfil.activo) {
    await sb.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  currentUser = {
    id: session.user.id,
    email: session.user.email,
    nombre: perfil.nombre,
    rol: perfil.rol
  };

  // Verificar permiso requerido para esta página
  if (requiredPermiso && !can(requiredPermiso)) {
    window.location.href = 'index.html';
    return null;
  }

  return currentUser;
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// Renderizar chip de usuario en topbar con menú desplegable
function renderUserChip() {
  const chip = document.getElementById('user-chip');
  if (!chip || !currentUser) return;
  const rolLabel = { propietario: 'Propietario', administrador: 'Admin', operador: 'Operador' };
  const initials = currentUser.nombre.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  chip.style.cursor = 'pointer';
  chip.onclick = toggleUserMenu;
  chip.innerHTML = `
    <div class="avatar">${initials}</div>
    ${currentUser.nombre.split(' ')[0]}
    <span style="font-size:10px;color:var(--tx3);margin-left:2px">(${rolLabel[currentUser.rol]})</span>
    <i class="ti ti-chevron-down" style="font-size:11px;margin-left:4px;color:var(--tx3)"></i>`;

  // Inject user menu + password modal into page if not already there
  if (!document.getElementById('user-menu')) {
    const menu = document.createElement('div');
    menu.id = 'user-menu';
    menu.style.cssText = 'position:fixed;top:56px;right:16px;background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:500;min-width:200px;overflow:hidden;display:none';
    menu.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid rgba(0,0,0,0.08)">
        <div style="font-size:13px;font-weight:600;color:#1A1A18">${currentUser.nombre}</div>
        <div style="font-size:11px;color:#A8A8A4;margin-top:2px">${currentUser.email}</div>
      </div>
      <div onclick="abrirCambioPass()" style="display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13px;color:#1A1A18;cursor:pointer" onmouseover="this.style.background='#F3F2EF'" onmouseout="this.style.background=''">
        <i class="ti ti-key" style="font-size:15px;color:#6B6B67"></i>Cambiar contraseña
      </div>
      <div onclick="logout()" style="display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13px;color:#C0392B;cursor:pointer;border-top:1px solid rgba(0,0,0,0.08)" onmouseover="this.style.background='#FFF0F0'" onmouseout="this.style.background=''">
        <i class="ti ti-logout" style="font-size:15px"></i>Cerrar sesión
      </div>`;
    document.body.appendChild(menu);

    // Password modal
    const modal = document.createElement('div');
    modal.id = 'pass-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:600;opacity:0;pointer-events:none;transition:opacity .2s';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;width:380px;max-width:95vw;transform:translateY(12px);transition:transform .2s">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div style="font-size:16px;font-weight:600">Cambiar contraseña</div>
          <button onclick="cerrarCambioPass()" style="width:28px;height:28px;border-radius:6px;border:1px solid rgba(0,0,0,0.1);background:transparent;cursor:pointer;font-size:15px;color:#6B6B67;display:flex;align-items:center;justify-content:center"><i class="ti ti-x"></i></button>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:#A8A8A4;margin-bottom:5px">Nueva contraseña</label>
          <input type="password" id="new-pass-1" placeholder="mínimo 6 caracteres" style="width:100%;padding:9px 12px;border:1px solid rgba(0,0,0,0.12);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none">
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:#A8A8A4;margin-bottom:5px">Repetir contraseña</label>
          <input type="password" id="new-pass-2" placeholder="repetí la contraseña" style="width:100%;padding:9px 12px;border:1px solid rgba(0,0,0,0.12);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none">
        </div>
        <div id="pass-error" style="background:#FFF0F0;border:1px solid #F5C0C0;border-radius:8px;padding:9px 12px;font-size:12px;color:#C0392B;margin-bottom:14px;display:none"></div>
        <button onclick="guardarCambioPass()" id="btn-cambiar-pass" style="width:100%;padding:11px;background:#E8711A;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#fff;cursor:pointer">Guardar contraseña</button>
      </div>`;
    document.body.appendChild(modal);
    modal.onclick = e => { if(e.target===modal) cerrarCambioPass(); };
  }

  // Close menu on outside click
  document.addEventListener('click', e => {
    const menu = document.getElementById('user-menu');
    const chip = document.getElementById('user-chip');
    if (menu && !menu.contains(e.target) && !chip.contains(e.target)) {
      menu.style.display = 'none';
    }
  }, { capture: true });
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' || !menu.style.display ? 'block' : 'none';
}

function abrirCambioPass() {
  document.getElementById('user-menu').style.display = 'none';
  const overlay = document.getElementById('pass-modal-overlay');
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'all';
  overlay.querySelector('div').style.transform = 'translateY(0)';
  document.getElementById('new-pass-1').value = '';
  document.getElementById('new-pass-2').value = '';
  document.getElementById('pass-error').style.display = 'none';
  setTimeout(() => document.getElementById('new-pass-1').focus(), 100);
}

function cerrarCambioPass() {
  const overlay = document.getElementById('pass-modal-overlay');
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  overlay.querySelector('div').style.transform = 'translateY(12px)';
}

async function guardarCambioPass() {
  const p1 = document.getElementById('new-pass-1').value;
  const p2 = document.getElementById('new-pass-2').value;
  const errEl = document.getElementById('pass-error');
  const btn = document.getElementById('btn-cambiar-pass');
  errEl.style.display = 'none';
  if (p1.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errEl.style.display = 'block'; return; }
  if (p1 !== p2) { errEl.textContent = 'Las contraseñas no coinciden.'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Guardando...';
  const { error } = await sb.auth.updateUser({ password: p1 });
  btn.disabled = false; btn.textContent = 'Guardar contraseña';
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  cerrarCambioPass();
  // Show success — use toast if available, fallback to alert
  if (typeof showToast === 'function') showToast('Contraseña actualizada');
  else alert('Contraseña actualizada correctamente');
}

// Mostrar/ocultar elementos según rol
function applyRoleUI() {
  // Botones de nav que requieren permiso
  const finBtn = document.getElementById('nav-finanzas');
  const edBtn  = document.getElementById('nav-editor');
  if (finBtn) finBtn.style.display = can('finanzas') ? '' : 'none';
  if (edBtn)  edBtn.style.display  = can('editor')   ? '' : 'none';

  // Acciones que requieren completar
  if (!can('completar')) {
    document.querySelectorAll('.action-completar').forEach(el => el.style.display='none');
  }
}
