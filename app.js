// ========================================
// FIREBASE CONFIG — REEMPLAZA CON TUS DATOS
// ========================================
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// ========================================
// FIREBASE INIT
// ========================================
let firebaseReady = false;
let db = null;
let auth = null;

try {
  if (firebaseConfig.apiKey !== "TU_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;
  }
} catch (e) {
  console.warn("Firebase no configurado, usando modo local", e);
}

// ========================================
// DOM ELEMENTS
// ========================================
const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const userNameEl = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const toastEl = document.getElementById('toast');

// Tier list elements
const monthSelect = document.getElementById('monthSelect');
const addChannelBtn = document.getElementById('addChannelBtn');
const saveDataBtn = document.getElementById('saveDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const publishBtn = document.getElementById('publishBtn');

// Modal
const modalOverlay = document.getElementById('channelModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const channelForm = document.getElementById('channelForm');
const modalTitle = document.getElementById('modalTitle');
const deleteChannelBtn = document.getElementById('deleteChannelBtn');
const canalIdInput = document.getElementById('canalId');
const canalFotoInput = document.getElementById('canalFoto');
const canalNombreInput = document.getElementById('canalNombre');
const canalNichoInput = document.getElementById('canalNicho');
const canalSubsInput = document.getElementById('canalSubs');

// Photo upload
const photoUploadArea = document.getElementById('photoUploadArea');
const photoUploadPrompt = document.getElementById('photoUploadPrompt');
const photoPreviewContainer = document.getElementById('photoPreviewContainer');
const photoPreview = document.getElementById('photoPreview');
const removePhotoBtn = document.getElementById('removePhotoBtn');
const canalFotoFile = document.getElementById('canalFotoFile');

// Community
const communityGrid = document.getElementById('communityGrid');
const communityEmpty = document.getElementById('communityEmpty');
const viewTierlistModal = document.getElementById('viewTierlistModal');
const closeViewModalBtn = document.getElementById('closeViewModalBtn');
const viewTierlistTitle = document.getElementById('viewTierlistTitle');
const viewTierlistContent = document.getElementById('viewTierlistContent');

// ========================================
// STATE
// ========================================
let channels = [];
let currentUser = null; // { uid, email, displayName }

const DEFAULT_AVATAR = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#e0e0e0"/><text x="50" y="58" text-anchor="middle" fill="#9aa0a6" font-family="sans-serif" font-size="36">?</text></svg>')}`;

const TIER_COLORS = { S: '#ea4335', A: '#fa7b17', B: '#f9ab00', C: '#34a853', D: '#4285f4' };

// ========================================
// UTILS
// ========================================
let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 2500);
}

function loadChannels() {
  const key = currentUser ? `tierlist_${currentUser.uid}` : 'tierlist_local';
  const saved = localStorage.getItem(key);
  if (saved) {
    try { channels = JSON.parse(saved); } catch(e) { channels = []; }
  } else {
    channels = [];
  }
}

function saveChannels() {
  const key = currentUser ? `tierlist_${currentUser.uid}` : 'tierlist_local';
  localStorage.setItem(key, JSON.stringify(channels));
}

// ========================================
// AUTH
// ========================================
const authTabs = document.querySelectorAll('.auth-tab');
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    loginForm.style.display = which === 'login' ? 'flex' : 'none';
    registerForm.style.display = which === 'register' ? 'flex' : 'none';
    loginError.textContent = '';
    registerError.textContent = '';
  });
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (firebaseReady) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      loginError.textContent = translateFirebaseError(err.code);
    }
  } else {
    // Local mode
    localLogin(email, email.split('@')[0]);
  }
});

// Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (firebaseReady) {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      // Save user doc
      await db.collection('users').doc(cred.user.uid).set({
        email: email,
        displayName: name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      registerError.textContent = translateFirebaseError(err.code);
    }
  } else {
    localLogin(email, name);
  }
});

function localLogin(email, name) {
  const uid = 'local_' + btoa(email).slice(0, 12);
  currentUser = { uid, email, displayName: name };
  localStorage.setItem('tierlist_local_user', JSON.stringify(currentUser));
  showApp();
}

function localLogout() {
  currentUser = null;
  localStorage.removeItem('tierlist_local_user');
  showAuth();
}

// Logout
logoutBtn.addEventListener('click', () => {
  if (firebaseReady) {
    auth.signOut();
  } else {
    localLogout();
  }
});

// Auth state observer
if (firebaseReady) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0]
      };
      showApp();
    } else {
      currentUser = null;
      showAuth();
    }
  });
} else {
  // Check local session
  const localUser = localStorage.getItem('tierlist_local_user');
  if (localUser) {
    try {
      currentUser = JSON.parse(localUser);
      showApp();
    } catch(e) {
      showAuth();
    }
  } else {
    showAuth();
  }
}

function showAuth() {
  authScreen.style.display = 'flex';
  appShell.style.display = 'none';
}

function showApp() {
  authScreen.style.display = 'none';
  appShell.style.display = 'block';
  userNameEl.textContent = currentUser.displayName;
  loadChannels();
  if (channels.length === 0) {
    channels = [{ id: '1', nombre: 'Canal Ejemplo', nicho: 'General', subs: '1K', month: 'Abril', tier: 'unranked', foto: '' }];
    saveChannels();
  }
  renderChannels();
  loadCommunity();
}

function translateFirebaseError(code) {
  const errors = {
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/weak-password': 'La contraseña debe tener mínimo 6 caracteres',
    'auth/invalid-email': 'Email inválido',
    'auth/too-many-requests': 'Demasiados intentos, espera un momento',
  };
  return errors[code] || 'Error: ' + code;
}

// ========================================
// NAVIGATION
// ========================================
const navTabs = document.querySelectorAll('.nav-tab');
const views = { tierlist: document.getElementById('viewTierlist'), community: document.getElementById('viewCommunity') };

navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const view = tab.dataset.view;
    Object.entries(views).forEach(([key, el]) => {
      el.style.display = key === view ? 'block' : 'none';
    });
    if (view === 'community') loadCommunity();
  });
});

// ========================================
// PHOTO UPLOAD
// ========================================
function handlePhotoFile(file) {
  if (!file || !file.type.match(/image\/(png|jpeg|webp)/)) { showToast('Solo PNG, JPG o WebP'); return; }
  if (file.size > 2 * 1024 * 1024) { showToast('Máximo 2MB'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    canalFotoInput.value = e.target.result;
    photoPreview.src = e.target.result;
    photoPreviewContainer.style.display = 'flex';
    photoUploadPrompt.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function resetPhotoUpload() {
  canalFotoInput.value = '';
  canalFotoFile.value = '';
  photoPreviewContainer.style.display = 'none';
  photoUploadPrompt.style.display = 'flex';
}

photoUploadArea.addEventListener('click', (e) => {
  if (e.target.closest('.remove-photo')) return;
  canalFotoFile.click();
});
canalFotoFile.addEventListener('change', (e) => { if (e.target.files[0]) handlePhotoFile(e.target.files[0]); });
photoUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); photoUploadArea.classList.add('drag-active'); });
photoUploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); photoUploadArea.classList.remove('drag-active'); });
photoUploadArea.addEventListener('drop', (e) => {
  e.preventDefault(); photoUploadArea.classList.remove('drag-active');
  if (e.dataTransfer.files[0]) handlePhotoFile(e.dataTransfer.files[0]);
});
removePhotoBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); resetPhotoUpload(); });

// ========================================
// RENDER TIER LIST
// ========================================
function renderChannels() {
  document.querySelectorAll('.tier-dropzone').forEach(z => z.innerHTML = '');
  const month = monthSelect.value;
  channels.filter(c => c.month === month).forEach(ch => {
    const card = createCard(ch);
    const zoneId = ch.tier === 'unranked' ? 'zone-unranked' : `zone-${ch.tier}`;
    const zone = document.getElementById(zoneId);
    if (zone) zone.appendChild(card);
  });
}

function createCard(data) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.draggable = true;
  card.id = `channel-${data.id}`;
  const img = data.foto || DEFAULT_AVATAR;

  card.innerHTML = `
    <button class="edit-btn" onclick="openEditModal('${data.id}')">
      <span class="material-symbols-rounded">edit</span>
    </button>
    <img src="${img}" alt="${data.nombre}" class="channel-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
    <div class="channel-info">
      <span class="channel-name" title="${data.nombre}">${data.nombre}</span>
      ${data.nicho ? `<span class="channel-niche">${data.nicho}</span>` : ''}
    </div>
    ${data.subs ? `<span class="channel-subs"><span class="material-symbols-rounded">group</span>${data.subs}</span>` : ''}
  `;

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', data.id);
    card.classList.add('dragging');
    setTimeout(() => card.style.opacity = '0.4', 0);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    card.style.opacity = '1';
    document.querySelectorAll('.tier-dropzone').forEach(z => z.classList.remove('drag-over'));
  });
  return card;
}

// Drag & Drop
document.querySelectorAll('.tier-dropzone').forEach(zone => {
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const idx = channels.findIndex(c => c.id == id);
    if (idx > -1) {
      channels[idx].tier = zone.dataset.zone;
      saveChannels();
      renderChannels();
    }
  });
});

// ========================================
// MODAL — Add/Edit Channel
// ========================================
addChannelBtn.addEventListener('click', () => {
  channelForm.reset();
  canalIdInput.value = '';
  resetPhotoUpload();
  modalTitle.textContent = 'Agregar Canal';
  deleteChannelBtn.style.display = 'none';
  modalOverlay.classList.add('active');
});

closeModalBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });

window.openEditModal = (id) => {
  const ch = channels.find(c => c.id == id);
  if (!ch) return;
  canalIdInput.value = ch.id;
  canalNombreInput.value = ch.nombre;
  canalNichoInput.value = ch.nicho || '';
  canalSubsInput.value = ch.subs || '';
  if (ch.foto) {
    canalFotoInput.value = ch.foto;
    photoPreview.src = ch.foto;
    photoPreviewContainer.style.display = 'flex';
    photoUploadPrompt.style.display = 'none';
  } else { resetPhotoUpload(); }
  modalTitle.textContent = 'Editar Canal';
  deleteChannelBtn.style.display = 'block';
  modalOverlay.classList.add('active');
};

channelForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = canalIdInput.value;
  const data = {
    foto: canalFotoInput.value.trim(),
    nombre: canalNombreInput.value.trim(),
    nicho: canalNichoInput.value.trim(),
    subs: canalSubsInput.value.trim(),
    month: monthSelect.value,
  };
  if (id) {
    const idx = channels.findIndex(c => c.id == id);
    if (idx > -1) channels[idx] = { ...channels[idx], ...data };
  } else {
    data.id = Date.now().toString();
    data.tier = 'unranked';
    channels.push(data);
  }
  saveChannels();
  renderChannels();
  modalOverlay.classList.remove('active');
  showToast('Canal guardado');
});

deleteChannelBtn.addEventListener('click', () => {
  const id = canalIdInput.value;
  if (id) {
    channels = channels.filter(c => c.id != id);
    saveChannels(); renderChannels();
    modalOverlay.classList.remove('active');
    showToast('Canal eliminado');
  }
});

monthSelect.addEventListener('change', () => renderChannels());

// ========================================
// SAVE / EXPORT / IMPORT
// ========================================
saveDataBtn.addEventListener('click', () => { saveChannels(); showToast(`Guardado: ${channels.length} canales`); });

exportDataBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, channels }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tierlist_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Exportado');
});

importDataBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.channels && Array.isArray(data.channels)) {
        channels = data.channels;
        saveChannels(); renderChannels();
        showToast(`Importado: ${channels.length} canales`);
      }
    } catch { showToast('Error al leer archivo'); }
  };
  reader.readAsText(file);
  importFileInput.value = '';
});

// ========================================
// PUBLISH TO COMMUNITY
// ========================================
publishBtn.addEventListener('click', async () => {
  const month = monthSelect.value;
  const monthChannels = channels.filter(c => c.month === month);
  const ranked = monthChannels.filter(c => c.tier !== 'unranked');

  if (ranked.length === 0) {
    showToast('Clasifica al menos un canal antes de publicar');
    return;
  }

  // Build tiers object (without full base64 to save space — use thumbnails)
  const tiers = {};
  ['S', 'A', 'B', 'C', 'D'].forEach(t => {
    tiers[t] = monthChannels.filter(c => c.tier === t).map(c => ({
      nombre: c.nombre,
      nicho: c.nicho || '',
      subs: c.subs || '',
      // Store a small version of the photo or empty
      foto: c.foto ? (c.foto.length > 50000 ? '' : c.foto) : ''
    }));
  });

  const publication = {
    userId: currentUser.uid,
    userName: currentUser.displayName,
    month: month,
    tiers: tiers,
    totalChannels: ranked.length,
    publishedAt: new Date().toISOString()
  };

  if (firebaseReady) {
    try {
      // Check if user already published for this month — update or create
      const existing = await db.collection('published_tierlists')
        .where('userId', '==', currentUser.uid)
        .where('month', '==', month)
        .get();

      if (!existing.empty) {
        await existing.docs[0].ref.update({ ...publication, publishedAt: firebase.firestore.FieldValue.serverTimestamp() });
      } else {
        publication.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('published_tierlists').add(publication);
      }
      showToast('¡Publicado en la comunidad!');
      loadCommunity();
    } catch (err) {
      console.error(err);
      showToast('Error al publicar');
    }
  } else {
    // Local mode — store in localStorage
    let localCommunity = JSON.parse(localStorage.getItem('tierlist_community') || '[]');
    const existIdx = localCommunity.findIndex(p => p.userId === currentUser.uid && p.month === month);
    if (existIdx > -1) {
      localCommunity[existIdx] = publication;
    } else {
      localCommunity.push(publication);
    }
    localStorage.setItem('tierlist_community', JSON.stringify(localCommunity));
    showToast('¡Publicado en la comunidad!');
    loadCommunity();
  }
});

// ========================================
// COMMUNITY — Load & Render
// ========================================
async function loadCommunity() {
  let publications = [];

  if (firebaseReady) {
    try {
      const snap = await db.collection('published_tierlists')
        .orderBy('publishedAt', 'desc')
        .limit(50)
        .get();
      publications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error loading community:', err);
    }
  } else {
    publications = JSON.parse(localStorage.getItem('tierlist_community') || '[]');
    publications.reverse(); // newest first
  }

  renderCommunity(publications);
}

function renderCommunity(publications) {
  communityGrid.innerHTML = '';

  if (publications.length === 0) {
    communityGrid.innerHTML = `
      <div class="community-empty">
        <span class="material-symbols-rounded">groups</span>
        <p>Aún no hay tier lists publicadas</p>
        <small>Sé el primero en publicar la tuya</small>
      </div>`;
    return;
  }

  publications.forEach(pub => {
    const card = document.createElement('div');
    card.className = 'community-card';
    card.onclick = () => openViewTierlist(pub);

    const initial = (pub.userName || '?')[0].toUpperCase();
    const dateStr = pub.publishedAt
      ? (typeof pub.publishedAt === 'string'
          ? new Date(pub.publishedAt).toLocaleDateString('es')
          : pub.publishedAt.toDate ? pub.publishedAt.toDate().toLocaleDateString('es') : '')
      : '';

    // Build mini tiers preview
    let tiersHtml = '';
    ['S', 'A', 'B', 'C', 'D'].forEach(tier => {
      const items = pub.tiers[tier] || [];
      if (items.length === 0) return;

      const maxShow = 5;
      let itemsHtml = items.slice(0, maxShow).map(ch => {
        const src = ch.foto || DEFAULT_AVATAR;
        return `<img class="mini-avatar" src="${src}" alt="${ch.nombre}" title="${ch.nombre}" onerror="this.src='${DEFAULT_AVATAR}'">`;
      }).join('');

      if (items.length > maxShow) {
        itemsHtml += `<span class="mini-count">+${items.length - maxShow}</span>`;
      }

      tiersHtml += `
        <div class="mini-tier">
          <div class="mini-tier-label" style="background:${TIER_COLORS[tier]}">${tier}</div>
          <div class="mini-tier-items">${itemsHtml}</div>
        </div>`;
    });

    card.innerHTML = `
      <div class="community-card-header">
        <div class="user-info">
          <div class="user-avatar">${initial}</div>
          <span>${pub.userName}</span>
        </div>
        <span class="month-badge">${pub.month}</span>
      </div>
      <div class="community-card-body">${tiersHtml}</div>
      <div class="community-card-footer">${dateStr} · ${pub.totalChannels} canales</div>
    `;

    communityGrid.appendChild(card);
  });
}

// View a community tier list in modal
function openViewTierlist(pub) {
  viewTierlistTitle.textContent = `${pub.userName} — ${pub.month}`;
  let html = '';

  ['S', 'A', 'B', 'C', 'D'].forEach(tier => {
    const items = pub.tiers[tier] || [];
    if (items.length === 0) return;

    const itemsHtml = items.map(ch => {
      const src = ch.foto || DEFAULT_AVATAR;
      return `
        <div class="mini-channel">
          <img class="mini-avatar" src="${src}" alt="${ch.nombre}" onerror="this.src='${DEFAULT_AVATAR}'">
          <span class="mini-channel-name" title="${ch.nombre}">${ch.nombre}</span>
        </div>`;
    }).join('');

    html += `
      <div class="mini-tier">
        <div class="mini-tier-label" style="background:${TIER_COLORS[tier]}">${tier}</div>
        <div class="mini-tier-items">${itemsHtml}</div>
      </div>`;
  });

  viewTierlistContent.innerHTML = html;
  viewTierlistModal.classList.add('active');
}

closeViewModalBtn.addEventListener('click', () => viewTierlistModal.classList.remove('active'));
viewTierlistModal.addEventListener('click', (e) => {
  if (e.target === viewTierlistModal) viewTierlistModal.classList.remove('active');
});
