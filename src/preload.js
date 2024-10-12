// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  onFindMIDIConnections: (callback) => ipcRenderer.on('MIDI-connections', (_event, value) => callback(value)),
  onFoundMIDIConnections: (devices) => ipcRenderer.send('MIDI-connections', devices),
  onMIDIConnect: (callback) => ipcRenderer.on('MIDI-connect', (_event, value) => callback(value)),
})