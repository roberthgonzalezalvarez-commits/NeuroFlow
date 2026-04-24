const fs = require('fs');
const filePath = 'C:/Users/rober/Desktop/NEUROFLOW 3.0/app.js';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /function renderProjectList\(msgs, container, isReceived\) \{[\s\S]*?\n\}\n/m;

const newCode = `function renderProjectList(msgs, container, isReceived) {
  container.innerHTML = '';
  if (msgs.length === 0) {
    container.innerHTML = \`
      <div class="community-empty">
        <span class="material-symbols-rounded">\${isReceived ? 'inbox' : 'outbox'}</span>
        <p>\${isReceived ? 'No tienes proyectos asignados' : 'No has iniciado proyectos'}</p>
      </div>\`;
    return;
  }

  msgs.forEach(m => {
    const relatedUser = isReceived ? m.senderName : m.recipientName;
    const dateStr = new Date(m.createdAt).toLocaleDateString('es') + ' ' + new Date(m.createdAt).toLocaleTimeString('es', {hour: '2-digit', minute:'2-digit'});
    
    const pt = m.type || 'Otro';
    const st = m.status || 'pendiente';
    
    const div = document.createElement('div');
    div.className = 'project-card';
    
    let statusBadge = st === 'realizado' 
      ? \`<span class="project-status status-realizado"><span class="material-symbols-rounded" style="font-size:14px;">check_circle</span> Realizado</span>\`
      : \`<span class="project-status status-pendiente"><span class="material-symbols-rounded" style="font-size:14px;">pending</span> Pendiente</span>\`;

    div.innerHTML = \`
      <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 8px;">\${pt}</div>
      <div style="font-size: 0.8rem; color: var(--text); display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
        <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
        \${isReceived ? 'De: ' : 'Para: '} <strong>\${relatedUser}</strong>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; margin-bottom: 12px;">
        <span class="material-symbols-rounded" style="font-size: 14px;">calendar_today</span>
        \${dateStr}
      </div>
      <div>\${statusBadge}</div>
    \`;

    div.style.cursor = 'pointer';
    div.onclick = () => {
      const modal = document.getElementById('projectDetailsModal');
      document.getElementById('pdTitle').textContent = pt;
      
      let attachHtml = '';
      if (m.fileBase64) {
        if (m.fileType && m.fileType.startsWith('image/')) {
          attachHtml = \`<a href="\${m.fileBase64}" download="adjunto" class="btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; padding:6px 12px; margin-right: 8px;">
            <span class="material-symbols-rounded">image</span> Ver imagen
          </a>\`;
        } else {
          attachHtml = \`<a href="\${m.fileBase64}" download="archivo" class="btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; padding:6px 12px; margin-right: 8px;">
            <span class="material-symbols-rounded">insert_drive_file</span> Descargar archivo
          </a>\`;
        }
      }
      
      let linkHtml = '';
      if (m.link) {
        linkHtml = \`<a href="\${m.link}" target="_blank" class="btn-secondary" style="background:var(--surface2); color:var(--text); text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; padding:6px 12px; border-radius:16px;">
          <span class="material-symbols-rounded">link</span> Visitar enlace
        </a>\`;
      }

      let textHtml = (m.text || '').replace(/(https?:\\/\\/[^\\s]+)/g, '<a href="$1" target="_blank" style="color: var(--primary); text-decoration: underline;">$1</a>');
      
      document.getElementById('pdMeta').innerHTML = \`
        <strong>\${isReceived ? 'Asignado por' : 'Asignado a'}:</strong> \${relatedUser}<br>
        <strong>Fecha:</strong> \${dateStr}<br>
        <strong>Estado:</strong> <span style="text-transform: capitalize;">\${st}</span>
      \`;
      
      document.getElementById('pdText').innerHTML = textHtml;
      document.getElementById('pdLinks').innerHTML = attachHtml + linkHtml;
      
      const markDoneBtn = document.getElementById('pdMarkDoneBtn');
      if (isReceived && st === 'pendiente') {
        markDoneBtn.style.display = 'inline-flex';
        markDoneBtn.onclick = () => { 
          markProjectDone(m.id); 
          modal.classList.remove('active');
        };
      } else {
        markDoneBtn.style.display = 'none';
      }

      document.getElementById('pdDeleteBtn').onclick = () => {
        deleteProjectMessage(m.id);
        modal.classList.remove('active');
      };

      modal.classList.add('active');
    };

    container.appendChild(div);
  });
}

// Ensure the modal can be closed via its close button or overlay click
if(document.getElementById('pdCloseBtn')) {
  document.getElementById('pdCloseBtn').onclick = () => document.getElementById('projectDetailsModal').classList.remove('active');
  document.getElementById('projectDetailsModal').onclick = (e) => {
    if (e.target === document.getElementById('projectDetailsModal')) e.target.classList.remove('active');
  };
}
`;

if (regex.test(content)) {
  content = content.replace(regex, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Success");
} else {
  console.log("Regex not matched");
}
