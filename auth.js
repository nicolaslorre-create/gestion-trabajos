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

// Renderizar chip de usuario en topbar
function renderUserChip() {
  const chip = document.getElementById('user-chip');
  if (!chip || !currentUser) return;
  const rolLabel = { propietario: 'Propietario', administrador: 'Admin', operador: 'Operador' };
  const initials = currentUser.nombre.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  chip.innerHTML = `
    <div class="avatar">${initials}</div>
    ${currentUser.nombre.split(' ')[0]}
    <span style="font-size:10px;color:var(--tx3);margin-left:2px">(${rolLabel[currentUser.rol]})</span>
    <button onclick="logout()" style="margin-left:8px;background:none;border:none;cursor:pointer;color:var(--tx3);font-size:13px;padding:0" title="Cerrar sesión">
      <i class="ti ti-logout" style="font-size:14px;vertical-align:-2px"></i>
    </button>`;
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
