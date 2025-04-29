const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const CONFIG_PATH = path.join(app.getPath('userData'), 'bastion-config.json');
const FILES_DIR = path.join(app.getPath('userData'), 'files');
const METADATA_PATH = path.join(FILES_DIR, 'metadata.json');

function ensureFilesDir() {
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });
  if (!fs.existsSync(METADATA_PATH)) fs.writeFileSync(METADATA_PATH, '[]');
}

function getMetadata() {
  ensureFilesDir();
  return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
}

function saveMetadata(meta) {
  fs.writeFileSync(METADATA_PATH, JSON.stringify(meta, null, 2));
}

function getMasterKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
}

function encryptFile(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptFile(buffer, key) {
  const iv = buffer.slice(0, 16);
  const tag = buffer.slice(16, 32);
  const data = buffer.slice(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
}

ipcMain.on('check-master-password', (event) => {
  const config = getConfig();
  event.sender.send('master-password-status', !!config.hash && !!config.salt);
});

ipcMain.on('set-master-password', (event, password) => {
  const salt = crypto.randomBytes(32).toString('hex');
  crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
    if (err) {
      event.sender.send('master-password-result', 'error');
      return;
    }
    saveConfig({ hash: derivedKey.toString('hex'), salt });
    event.sender.send('master-password-result', 'ok');
  });
});

ipcMain.on('verify-master-password', (event, password) => {
  const config = getConfig();
  if (!config.hash || !config.salt) {
    event.sender.send('master-password-result', 'error');
    return;
  }
  crypto.pbkdf2(password, config.salt, 100000, 64, 'sha512', (err, derivedKey) => {
    if (err) {
      event.sender.send('master-password-result', 'error');
      return;
    }
    if (derivedKey.toString('hex') === config.hash) {
      event.sender.send('master-password-result', 'ok');
    } else {
      event.sender.send('master-password-result', 'fail');
    }
  });
});

ipcMain.on('import-file', async (event) => {
  const config = getConfig();
  if (!config.hash || !config.salt) return;
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (canceled || filePaths.length === 0) return;
  const filePath = filePaths[0];
  const fileBuffer = fs.readFileSync(filePath);
  const key = getMasterKey(config.hash, config.salt); // Use hash as password for key derivation
  const encrypted = encryptFile(fileBuffer, key);
  const id = crypto.randomBytes(16).toString('hex');
  const name = path.basename(filePath);
  const outPath = path.join(FILES_DIR, id + '.bin');
  fs.writeFileSync(outPath, encrypted);
  const meta = getMetadata();
  meta.push({ id, name, size: fileBuffer.length, date: Date.now() });
  saveMetadata(meta);
  event.sender.send('refresh-file-list');
});

ipcMain.on('list-encrypted-files', (event) => {
  const meta = getMetadata();
  event.sender.send('encrypted-files-list', meta);
});

ipcMain.on('delete-file', (event, id) => {
  const meta = getMetadata();
  const idx = meta.findIndex(f => f.id === id);
  if (idx !== -1) {
    const filePath = path.join(FILES_DIR, id + '.bin');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    meta.splice(idx, 1);
    saveMetadata(meta);
    event.sender.send('refresh-file-list');
  }
});

ipcMain.on('export-file', async (event, id) => {
  const config = getConfig();
  if (!config.hash || !config.salt) return;
  const meta = getMetadata();
  const file = meta.find(f => f.id === id);
  if (!file) return;
  const encryptedPath = path.join(FILES_DIR, id + '.bin');
  if (!fs.existsSync(encryptedPath)) return;
  const encrypted = fs.readFileSync(encryptedPath);
  const key = getMasterKey(config.hash, config.salt);
  let decrypted;
  try {
    decrypted = decryptFile(encrypted, key);
  } catch {
    return;
  }
  const { filePath } = await dialog.showSaveDialog({ defaultPath: file.name });
  if (filePath) {
    fs.writeFileSync(filePath, decrypted);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'BastionIcon.ico'),
    title: 'Bastion - Encrypted File Manager',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    frame: true,
  });
  win.once('ready-to-show', () => win.show());

  // Load Vite dev server in development, or built files in production
  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
