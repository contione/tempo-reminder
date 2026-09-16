export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface DaySchedule {
  day: Weekday
  enabled: boolean
  time: string
}

export interface Settings {
  version: 1
  enabled: boolean
  schedule: DaySchedule[]
  tempoUrl: string
  launchAtLogin: boolean
}

export interface ReminderHistory {
  lastReminderDate: string | null
  lastReminderAt: string | null
}

export interface AppState {
  settings: Settings
  device: { username: string; hostname: string; platform: string; timezone: string }
  nextReminder: string | null
  lastReminderAt: string | null
  notificationSupported: boolean
  launchAtLoginSupported: boolean
  storageWarning: string | null
}

export interface TempoApi {
  getState: () => Promise<AppState>
  saveSettings: (settings: Settings) => Promise<AppState>
  testReminder: () => Promise<void>
  openTempo: () => Promise<void>
}
