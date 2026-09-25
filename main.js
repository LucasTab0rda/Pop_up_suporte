const { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain, clipboard, dialog, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

let tray = null;
let win = null;
let updateReadyVersion = null; // versão baixada aguardando reinício


function checklistFilePath() {
  return path.join(app.getPath('userData'), 'conferencia-os-checklist.json');
}

const DEFAULT_CHECKLIST = {
  v: 2,
  instalacao: [
    { id: 'inst-sinal-status', t: 'Sinal pelo status do equipamento', obr: false },
    { id: 'inst-lacre-fibra', t: 'Lacre de identificação instalado na fibra', obr: true },
    { id: 'inst-teste-velocidade', t: 'Teste de velocidade', obr: true },
    { id: 'inst-foto-instalacao', t: 'Foto da instalação', obr: true },
    { id: 'inst-cto-fechada', t: 'CTO ou CTOi devidamente fechada', obr: false },
    { id: 'inst-potencia-externa', t: 'Potência externa com cordão óptico (1490 nm)', obr: true },
    { id: 'inst-potencia-interna', t: 'Potência interna (1490 nm)', obr: true },
    { id: 'inst-acesso-remoto', t: 'Acesso remoto', obr: true },
    { id: 'inst-sn-equipamento', t: 'SN (número de série) do equipamento', obr: true },
    { id: 'inst-cto-inmap', t: 'Sigla da CTO via Inmap', obr: false },
    { id: 'inst-comprovante-assinatura', t: 'Comprovante com assinatura do cliente', obr: false },
    { id: 'inst-adesivo-senha', t: 'Adesivo com a senha do cliente', obr: false }
  ],
  manutencao: [
    { id: 'man-sinal-status', t: 'Sinal via aplicativo ou status do equipamento', obr: false },
    { id: 'man-teste-velocidade', t: 'Teste de velocidade atingindo a banda contratada', obr: true },
    { id: 'man-foto-local', t: 'Foto do local da instalação (toda a parede/móvel)', obr: false },
    { id: 'man-potencia-interna', t: 'Potência interna aferida na frequência 1490 nm', obr: false },
    { id: 'man-acesso-remoto', t: 'Acesso remoto', obr: true }
  ]
};

function isValidChecklistList(list) {
  return (
    Array.isArray(list) &&
    list.every(
      (it) =>
        it &&
        typeof it === 'object' &&
        typeof it.t === 'string' &&
        it.t.trim().length > 0 &&
        typeof it.obr === 'boolean'
    )
  );
}

function normalizeChecklist(data) {
  if (!data || typeof data !== 'object') return null;
  if (!isValidChecklistList(data.instalacao) || !isValidChecklistList(data.manutencao)) return null;
  const withIds = (list, prefix) =>
    list.map((it, i) => ({
      id: typeof it.id === 'string' && it.id ? it.id : `${prefix}-${i}-${crypto.randomUUID()}`,
      t: it.t.trim(),
      obr: !!it.obr
    }));
  return {
    v: 2,
    instalacao: withIds(data.instalacao, 'inst'),
    manutencao: withIds(data.manutencao, 'man')
  };
}

async function readChecklist() {
  try {
    const raw = await fs.readFile(checklistFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    // v < 2: arquivo antigo sem os marcadores de obrigatório corretos — usa o padrão atualizado
    if (!parsed || typeof parsed.v !== 'number' || parsed.v < 2) return DEFAULT_CHECKLIST;
    const normalized = normalizeChecklist(parsed);
    return normalized || DEFAULT_CHECKLIST;
  } catch {
    return DEFAULT_CHECKLIST;
  }
}

async function writeChecklist(data) {
  const normalized = normalizeChecklist(data);
  if (!normalized) throw new Error('Checklist inválido.');
  await fs.writeFile(checklistFilePath(), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

// Garante instância única
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

app.on('second-instance', () => {
  if (win) { win.isVisible() ? win.focus() : showWindow(); }
});

function getAsset(name) {
  return path.join(__dirname, 'assets', name);
}

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 420,
    minHeight: 600,
    show: false,
    frame: false,          // Sem barra de título padrão
    resizable: true,
    alwaysOnTop: true,     // ← Janela flutuante sobre tudo
    skipTaskbar: true,     // Não aparece na barra de tarefas
    backgroundColor: '#0b1e3d',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');

  // Impede fechar — apenas esconde
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });
}

function positionWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const [w, h] = win.getSize();
  // Canto inferior direito com margem
  const x = width - w - 20;
  const y = height - h - 20;
  win.setPosition(x > 0 ? x : 20, y > 0 ? y : 20);
}

function showWindow() {
  positionWindow();
  win.show();
  win.focus();
}

function toggleWindow() {
  if (win.isVisible()) { win.hide(); }
  else { showWindow(); }
}

function rebuildTrayMenu() {
  const openAtLogin = app.getLoginItemSettings().openAtLogin;

  const updateMenuItem = updateReadyVersion
    ? {
        label: `🔄  Reiniciar e atualizar para v${updateReadyVersion}`,
        click: () => autoUpdater.quitAndInstall(true, true)
      }
    : {
        label: '🔍  Verificar atualizações',
        click: checkForUpdatesManually
      };

  const menu = Menu.buildFromTemplate([
    { label: '📋  Abrir Conferência', click: toggleWindow },
    { type: 'separator' },
    updateMenuItem,
    { type: 'separator' },
    {
      label: 'Iniciar com o Windows',
      type: 'checkbox',
      checked: openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked, args: ['--hidden'] });
      }
    },
    { type: 'separator' },
    { label: 'Sair', click: () => { win.destroy(); app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}

function checkForUpdatesManually() {
  if (!app.isPackaged) {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Modo desenvolvimento',
      message: 'Verificação de atualizações só funciona no app instalado.'
    });
    return;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    dialog.showMessageBox(win, {
      type: 'error',
      title: 'Erro ao verificar atualizações',
      message: 'Não foi possível verificar atualizações.',
      detail: String(err.message || err)
    });
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    tray && tray.setToolTip(`Conferência de O.S. — Baixando v${info.version}...`);
  });

  autoUpdater.on('update-not-available', () => {
    tray && tray.setToolTip('Implantar Conferência');
  });

  autoUpdater.on('download-progress', (prog) => {
    const pct = Math.round(prog.percent);
    tray && tray.setToolTip(`Conferência de O.S. — Baixando atualização ${pct}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    tray && tray.setToolTip('Implantar Conferência');
    updateReadyVersion = info.version;
    rebuildTrayMenu();

    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Atualização disponível',
      message: `Nova versão ${info.version} pronta para instalar.`,
      detail: 'Reinicie o aplicativo para aplicar a atualização. Seus dados não serão perdidos.',
      buttons: ['Reiniciar agora', 'Mais tarde'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(true, true);
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater]', err);
    tray && tray.setToolTip('Implantar Conferência');
  });

  // Verificação automática 5 segundos após o app iniciar
  setTimeout(() => autoUpdater.checkForUpdates().catch(console.error), 5000);
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.implantar.conferencia-os');

  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] });
  }

  // Tray
  const trayIconPath = getAsset('tray.ico');
  const trayImg = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(trayImg.isEmpty() ? nativeImage.createFromPath(getAsset('tray.png')) : trayImg);
  tray.setToolTip('Implantar Conferência');
  tray.on('click', toggleWindow);
  rebuildTrayMenu();

  createWindow();

  const shortcutRegistered = globalShortcut.register('CommandOrControl+Alt+O', toggleWindow);
  if (!shortcutRegistered) {
    console.error('Não foi possível registrar o atalho global Ctrl/Cmd+Alt+O (em uso por outro app).');
  }

  setupAutoUpdater();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC — copiar texto via Electron (mais confiável que web API)
ipcMain.on('copy-text', (_, text) => {
  clipboard.writeText(text);
});

// IPC — esconder janela
ipcMain.on('hide-window', () => { if (win) win.hide(); });

// Backup do histórico por operador (espelho do localStorage da interface)
ipcMain.handle('persist-history', async (_, payload) => {
  try {
    const userId = payload && typeof payload === 'object' ? payload.userId : null;
    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
    const file = historyFilePath(userId);
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true };
  } catch (err) {
    console.error('persist-history:', err);
    return { ok: false, message: String(err.message || err) };
  }
});

// Espelho do histórico em disco — permite recuperar quando o localStorage foi perdido
function historyFilePath(userId) {
  const dir = app.getPath('userData');
  // Aceita apenas UUID gerado por crypto.randomUUID() — bloqueia path traversal
  const safeId =
    userId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId))
      ? String(userId)
      : null;
  const name = safeId
    ? `conferencia-os-historico-${safeId}.json`
    : 'conferencia-os-historico.json';
  return path.join(dir, name);
}

ipcMain.handle('history-read', async (_, userId) => {
  try {
    const raw = await fs.readFile(historyFilePath(userId), 'utf8');
    return { ok: true, data: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('history-export', async (_, { state, meta }) => {
  try {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar backup do histórico',
      defaultPath: `conferencia-os-historico-backup-${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    const payload = {
      app: 'conferencia-os',
      kind: 'history-backup',
      exportedAt: Date.now(),
      userId: meta && meta.userId ? meta.userId : null,
      displayName: meta && meta.displayName ? meta.displayName : null,
      state
    };
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('history-import', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Importar backup do histórico',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePaths || !filePaths.length) return { ok: false, canceled: true };
    const raw = await fs.readFile(filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.kind !== 'history-backup' || typeof parsed.state !== 'object') {
      return { ok: false, error: 'Arquivo de backup inválido.' };
    }
    return { ok: true, userId: parsed.userId || null, displayName: parsed.displayName || null, state: parsed.state };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('checklist-get', async () => {
  return await readChecklist();
});

ipcMain.handle('checklist-save', async (_, payload) => {
  try {
    const saved = await writeChecklist(payload);
    return { ok: true, data: saved };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});


// Impede sair ao fechar todas as janelas
app.on('window-all-closed', (e) => e.preventDefault());
