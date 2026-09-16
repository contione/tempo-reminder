import { contextBridge, ipcRenderer } from 'electron'
import type { TempoApi } from '../shared/types'

const api: TempoApi = {
  getState: () => ipcRenderer.invoke('tempo:state'),
  saveSettings: (settings) => ipcRenderer.invoke('tempo:save', settings),
  testReminder: () => ipcRenderer.invoke('tempo:test'),
  openTempo: () => ipcRenderer.invoke('tempo:open')
}

contextBridge.exposeInMainWorld('tempo', api)
