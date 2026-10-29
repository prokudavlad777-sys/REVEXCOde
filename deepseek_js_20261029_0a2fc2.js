'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Безпечна підписка з можливістю відписки
function subscribe(channel, handler) {
  const wrapped = (_event, payload) => handler(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld('revex', {
  // --- Чат / Ollama ---
  chat: {
    send: (payload) => ipcRenderer.invoke('ollama:chat', payload),
    stop: () => ipcRenderer.invoke('ollama:stop'),
    continue: (payload) => ipcRenderer.invoke('ollama:continue', payload),
    repeat: (payload) => ipcRenderer.invoke('ollama:repeat', payload),
    onToken: (cb) => subscribe('ollama:token', cb),
    onDone: (cb) => subscribe('ollama:done', cb),
    onError: (cb) => subscribe('ollama:error', cb),
    onStats: (cb) => subscribe('ollama:stats', cb)
  },

  // --- Моделі ---
  models: {
    list: () => ipcRenderer.invoke('models:list'),
    compat: () => ipcRenderer.invoke('models:compat'),
    pull: (name) => ipcRenderer.invoke('models:pull', name),
    remove: (name) => ipcRenderer.invoke('models:remove', name),
    test: (name) => ipcRenderer.invoke('models:test', name),
    onPullProgress: (cb) => subscribe('models:pull-progress', cb)
  },

  // --- Файли / проєкт ---
  files: {
    openFolder: () => ipcRenderer.invoke('files:open-folder'),
    read: (relPath) => ipcRenderer.invoke('files:read', relPath),
    write: (relPath, content) => ipcRenderer.invoke('files:write', relPath, content),
    list: (relPath) => ipcRenderer.invoke('files:list', relPath),
    tree: () => ipcRenderer.invoke('files:tree'),
    root: () => ipcRenderer.invoke('files:root')
  },

  project: {
    index: () => ipcRenderer.invoke('project:index'),
    search: (query, topK) => ipcRenderer.invoke('project:search', query, topK),
    onIndexProgress: (cb) => subscribe('project:index-progress', cb)
  },

  // --- Обладнання / рушій ---
  hardware: {
    detect: () => ipcRenderer.invoke('hardware:detect'),
    ollamaStatus: () => ipcRenderer.invoke('hardware:ollama-status')
  },

  // --- Запуск коду в ізольованій копії ---
  runner: {
    run: (relPath) => ipcRenderer.invoke('runner:run', relPath),
    onOutput: (cb) => subscribe('runner:output', cb)
  },

  // --- Налаштування ---
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    all: () => ipcRenderer.invoke('settings:all')
  },

  // --- Вкладення / OCR ---
  attachments: {
    save: (dataUrl, filename) => ipcRenderer.invoke('attachments:save', dataUrl, filename),
    ocr: (relPath) => ipcRenderer.invoke('attachments:ocr', relPath)
  },

  // --- Системні події ---
  onAppError: (cb) => subscribe('app:error', cb)
});