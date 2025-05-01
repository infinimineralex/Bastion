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
  try {
    return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  } catch (error) {
    console.error("Error reading metadata:", error);
    // Will handle error appropriately
    return [];
  }
}

function saveMetadata(meta) {
   ensureFilesDir(); // Ensure directory exists before writing
   try {
      fs.writeFileSync(METADATA_PATH, JSON.stringify(meta, null, 2));
   } catch (error) {
      console.error("Error saving metadata:", error);
   }
}

function getMasterKey(password, salt) {
  // Ensure salt is a Buffer or string
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, 'hex');
  return crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha512');
}

function encryptFile(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Prepend IV and Tag to the encrypted data for storage
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptFile(buffer, key) {
  try {
    const iv = buffer.slice(0, 16);
    const tag = buffer.slice(16, 32);
    const data = buffer.slice(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // Rethrow or return null/undefined to indicate failure
    throw new Error("Decryption failed. Invalid key or corrupted data.");
  }
}

function getConfig() {
  try {
    // Check if config file exists before reading
    if (fs.existsSync(CONFIG_PATH)) {
       return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    return {}; // Return empty object if file doesn't exist
  } catch (error) {
    console.error("Error reading config:", error);
    return {}; // Return empty object on error
  }
}

function saveConfig(config) {
   try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
   } catch (error) {
      console.error("Error saving config:", error);
   }
}

ipcMain.on('check-master-password', (event) => {
  const config = getConfig();
  // Check specifically for non-empty hash and salt
  event.sender.send('master-password-status', !!config.hash && !!config.salt);
});

ipcMain.on('set-master-password', (event, password) => {
  if (!password) {
     console.error("Attempted to set an empty password.");
     event.sender.send('master-password-result', 'error', 'Password cannot be empty.');
     return;
  }
  const salt = crypto.randomBytes(32).toString('hex'); // Generate a secure salt
  // Use async PBKDF2 for better performance (doesn't block main thread)
  crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
    if (err) {
      console.error("Error deriving key:", err);
      event.sender.send('master-password-result', 'error', 'Failed to process password.');
      return;
    }
    saveConfig({ hash: derivedKey.toString('hex'), salt });
    event.sender.send('master-password-result', 'ok');
  });
});

ipcMain.on('verify-master-password', (event, password) => {
  const config = getConfig();
  if (!config.hash || !config.salt) {
    console.error("Master password not set, cannot verify.");
    event.sender.send('master-password-result', 'error', 'Master password not set.');
    return;
  }
   if (!password) {
     console.error("Attempted to verify an empty password.");
     event.sender.send('master-password-result', 'fail', 'Password cannot be empty.');
     return;
  }
  // Use async PBKDF2
  crypto.pbkdf2(password, config.salt, 100000, 64, 'sha512', (err, derivedKey) => {
    if (err) {
      console.error("Error deriving key during verification:", err);
      event.sender.send('master-password-result', 'error', 'Failed to process password.');
      return;
    }
    // Securely compare derived key with stored hash
    const storedHashBuffer = Buffer.from(config.hash, 'hex');
    if (crypto.timingSafeEqual(derivedKey, storedHashBuffer)) {
      event.sender.send('master-password-result', 'ok');
    } else {
      event.sender.send('master-password-result', 'fail', 'Incorrect password.');
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
    autoHideMenuBar: true,
    show: false,
    frame: true,
  });
  win.once('ready-to-show', () => win.show());

  if (!app.isPackaged) {
    // Development: Load from Vite Dev Server
    console.log('Loading URL: http://localhost:5173');
    win.loadURL('http://localhost:5173');
    // uncomment this to open DevTools automatically in development
    //win.webContents.openDevTools();
  } else {
    // Production: Load the index.html from the 'dist' folder relative to the app root.
    // Use app.getAppPath() to find the root of the packaged application.
    const indexPath = path.join(app.getAppPath(), 'dist/index.html');
    console.log(`Production Mode: Loading file: ${indexPath}`);

    // Verify the file exists before trying to load it
    if (fs.existsSync(indexPath)) {
        win.loadFile(indexPath)
            .then(() => { console.log("Production index.html loaded successfully."); })
            .catch(err => {
                console.error(`Failed to load file with win.loadFile: ${indexPath}`, err);
                dialog.showErrorBox('Load Error', `Failed to load the application interface using loadFile: ${err.message}`);
            });
    } else {
        console.error(`Production index.html not found at expected path: ${indexPath}`);
        dialog.showErrorBox('Load Error', `Application file not found at ${indexPath}. The application might be corrupted or installed incorrectly.`);
    }

    // If needed we have a listener for load failure (though loadFile promise handles it too)
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
       console.error(`webContents failed to load URL: ${validatedURL}`, errorCode, errorDescription);
       // Avoid showing duplicate dialog if loadFile already caught it.
       // dialog.showErrorBox('Load Error', `Failed to load the application interface: ${errorDescription}`);
    });
  }
}

app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();

  // Handle macOS activation
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
