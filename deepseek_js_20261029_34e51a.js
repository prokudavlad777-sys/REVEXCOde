'use strict';

const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// --- CSP: дозволяємо Monaco workers через blob: ---
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:11434 http://localhost:11434"
].join('; ');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0f1115',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // потрібно для preload з require
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// --- Реєстрація всіх IPC-модулів ---
function registerIpc() {
  const modules = [
    './ipc/ollama',
    './ipc/models',
    './ipc/files',
    './ipc/project',
    './ipc/hardware',
    './ipc/runner',
    './ipc/settings',
    './ipc/attachments'
  ];
  for (const m of modules) {
    try {
      require(m)(ipcMain, () => mainWindow);
    } catch (err) {
      console.error(`[IPC] failed to load ${m}:`, err.message);
    }
  }
}

app.whenReady().then(() => {
  // Застосовуємо CSP до всіх відповідей
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP]
      }
    });
  });

  // Дозволяємо доступ до локальних файлів проєкту лише через IPC
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Глобальні помилки, щоб не падало мовчки ---
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:error', { message: err.message });
  }
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

module.exports = { createWindow };