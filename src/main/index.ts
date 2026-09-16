import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  Notification,
  powerMonitor,
  shell,
  screen,
  Tray
} from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { hostname, userInfo } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SettingsStore } from '../core/store'
import { defaultSettings, validateSettings } from '../core/settings'
import { dueReminder, localDateKey, nextReminderAt } from '../core/scheduler'
import type { AppState, ReminderHistory, Settings } from '../shared/types'

const appId = 'com.tempo-reminder.desktop'
app.setName('Tempo Reminder')
app.setAppUserModelId(appId)
if (!app.isPackaged && process.env.TEMPO_REMINDER_DATA_DIR) {
  app.setPath('userData', process.env.TEMPO_REMINDER_DATA_DIR)
}

let window: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let settings = defaultSettings()
let history: ReminderHistory = { lastReminderDate: null, lastReminderAt: null }
let storageWarning: string | null = null
let store: SettingsStore
let timer: ReturnType<typeof setInterval> | undefined
let pending: Promise<unknown> = Promise.resolve()
const notifications = new Set<Notification>()

function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work)
  pending = result.catch(() => undefined)
  return result
}

function resource(name: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, name)
    : join(__dirname, '../../resources', name)
}

function showWindow(): void {
  if (!window || window.isDestroyed()) createWindow()
  if (window!.isMinimized()) window!.restore()
  window!.show()
  window!.focus()
}

function createWindow(): void {
  nativeTheme.themeSource = 'dark'
  const workArea = screen.getPrimaryDisplay().workAreaSize
  window = new BrowserWindow({
    width: Math.min(1140, Math.max(820, workArea.width - 56)),
    height: Math.min(940, Math.max(640, workArea.height - 56)),
    minWidth: 820,
    minHeight: 640,
    title: 'Tempo Reminder',
    backgroundColor: '#181b21',
    icon: resource('icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  window.on('close', (event) => {
    if (!quitting && tray) {
      event.preventDefault()
      window?.hide()
    }
  })
  window.on('closed', () => {
    window = null
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false)
  )
  window.once('ready-to-show', () => {
    const loginLaunch = process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAtLogin
    if ((!process.argv.includes('--hidden') && !loginLaunch) || !tray) window?.show()
  })
  const url = process.env.ELECTRON_RENDERER_URL
  const loading =
    !app.isPackaged && url
      ? window.loadURL(url)
      : window.loadFile(join(__dirname, '../renderer/index.html'))
  void loading.catch((error: unknown) => {
    dialog.showErrorBox('界面加载失败', String(error))
    app.quit()
  })
}

function loginSupported(): boolean {
  return app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin')
}

function applyLogin(enabled: boolean): void {
  if (!loginSupported()) return
  app.setLoginItemSettings({ openAtLogin: enabled, args: ['--hidden'] })
}

function state(): AppState {
  let username = '未知用户'
  try {
    username = userInfo().username
  } catch {
    /* Restricted OS accounts may omit this field. */
  }
  return {
    settings,
    device: {
      username,
      hostname: hostname(),
      platform: process.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    nextReminder: nextReminderAt(settings, history, new Date())?.toISOString() ?? null,
    lastReminderAt: history.lastReminderAt,
    notificationSupported: Notification.isSupported(),
    launchAtLoginSupported: loginSupported(),
    storageWarning
  }
}

async function openTempo(): Promise<void> {
  const { tempoUrl } = validateSettings(settings)
  if (!tempoUrl) throw new Error('先保存你的 Tempo 页面地址，再出发。')
  await shell.openExternal(tempoUrl)
}

function reportError(error: unknown): void {
  showWindow()
  void dialog.showMessageBox(window!, {
    type: 'error',
    title: '操作未完成',
    message: error instanceof Error ? error.message : String(error)
  })
}

const reminderLines = [
  '下班可以潇洒，工时不能蒸发 😎',
  '今天的努力，值得在 Tempo 里拥有姓名。',
  '电脑准备下班了，你的工时还在等一个名分。',
  '收工前最后一件小事：给今天的忙碌留个证据。',
  '工时不填，周五的你会穿越回来找你。'
]

async function fallbackReminder(body: string): Promise<void> {
  showWindow()
  const result = await dialog.showMessageBox(window!, {
    type: 'info',
    title: '该给今天的努力记个账了',
    message: body,
    detail: '系统通知不可用，先在这里提醒你。',
    buttons: settings.tempoUrl ? ['打开 Tempo', '知道啦'] : ['知道啦'],
    cancelId: settings.tempoUrl ? 1 : 0
  })
  if (settings.tempoUrl && result.response === 0) await openTempo().catch(reportError)
}

function notify(test = false): void {
  const body = reminderLines[Math.floor(Math.random() * reminderLines.length)]
  if (!Notification.isSupported()) {
    void fallbackReminder(body)
    return
  }
  const notification = new Notification({
    title: test ? '叮！这是一条认真搞笑的测试提醒' : '该给今天的努力记个账了',
    body: `${body}\n${settings.tempoUrl ? '点击打开 Tempo，写完安心下班。' : '点击设置 Tempo 地址，写完安心下班。'}`,
    icon: resource('icon.png'),
    silent: false
  })
  notifications.add(notification)
  notification.once('click', () => {
    notifications.delete(notification)
    if (settings.tempoUrl) void openTempo().catch(reportError)
    else showWindow()
  })
  notification.once('close', () => notifications.delete(notification))
  notification.once('failed', () => {
    notifications.delete(notification)
    void fallbackReminder(body)
  })
  try {
    notification.show()
  } catch {
    notifications.delete(notification)
    void fallbackReminder(body)
  }
}

async function tick(): Promise<void> {
  await exclusive(async () => {
    const now = new Date()
    if (!dueReminder(settings, history, now)) return
    const nextHistory = { lastReminderDate: localDateKey(now), lastReminderAt: now.toISOString() }
    // Persist before delivery so timer, resume and restart cannot send duplicate reminders.
    await store.saveHistory(nextHistory)
    history = nextHistory
    notify()
    updateTray()
  }).catch((error: unknown) => {
    // A write failure must not silently pretend the reminder was recorded.
    storageWarning = `提醒记录保存失败：${error instanceof Error ? error.message : String(error)}`
    showWindow()
  })
}

async function save(input: unknown): Promise<AppState> {
  return exclusive(async () => {
    const next = validateSettings(input)
    if (!loginSupported() && next.launchAtLogin !== settings.launchAtLogin)
      throw new Error('开机启动需要 Windows 或 macOS 的安装版。')
    if (next.launchAtLogin !== settings.launchAtLogin) applyLogin(next.launchAtLogin)
    try {
      await store.saveSettings(next)
    } catch (error) {
      if (next.launchAtLogin !== settings.launchAtLogin) applyLogin(settings.launchAtLogin)
      throw error
    }
    settings = next
    updateTray()
    return state()
  })
}

function updateTray(): void {
  if (!tray) return
  tray.setToolTip(`Tempo Reminder · ${settings.enabled ? '提醒已开启' : '提醒已暂停'}`)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开提醒设置', click: showWindow },
      {
        label: '打开 Tempo',
        enabled: Boolean(settings.tempoUrl),
        click: () => {
          void openTempo().catch(reportError)
        }
      },
      { type: 'separator' },
      {
        label: settings.enabled ? '暂停提醒' : '开启提醒',
        click: () => {
          void save({ ...settings, enabled: !settings.enabled })
            .then(() => tick())
            .catch(reportError)
        }
      },
      { label: '发送测试提醒', click: () => notify(true) },
      { type: 'separator' },
      { label: '退出 Tempo Reminder', click: () => app.quit() }
    ])
  )
}

function trusted(event: IpcMainInvokeEvent): void {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame
  )
    throw new Error('拒绝未知页面请求。')
  const expected =
    !app.isPackaged && process.env.ELECTRON_RENDERER_URL
      ? process.env.ELECTRON_RENDERER_URL
      : pathToFileURL(join(__dirname, '../renderer/index.html')).href
  const actual = new URL(event.senderFrame.url)
  const allowed = new URL(expected)
  if (actual.origin !== allowed.origin || actual.pathname !== allowed.pathname)
    throw new Error('拒绝未知来源请求。')
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)
  app.on('activate', () => {
    if (app.isReady()) showWindow()
  })
  app.on('before-quit', () => {
    quitting = true
    if (timer) clearInterval(timer)
  })
  app.on('window-all-closed', () => {
    if (!tray) app.quit()
  })
  void app
    .whenReady()
    .then(async () => {
      store = new SettingsStore(app.getPath('userData'))
      const loaded = await store.load()
      settings = loaded.settings
      history = loaded.history
      storageWarning = loaded.warning
      createWindow()
      try {
        const icon = nativeImage.createFromPath(
          resource(process.platform === 'darwin' ? 'trayTemplate.png' : 'icon.png')
        )
        if (process.platform === 'darwin') icon.setTemplateImage(true)
        tray = new Tray(icon.resize({ width: process.platform === 'darwin' ? 18 : 24 }))
        tray.on('click', showWindow)
        updateTray()
      } catch {
        storageWarning = '系统托盘不可用，请保持窗口开启以接收提醒。'
      }
      ipcMain.handle('tempo:state', (event) => {
        trusted(event)
        return state()
      })
      ipcMain.handle('tempo:save', async (event, input: Settings) => {
        trusted(event)
        const result = await save(input)
        void tick()
        return result
      })
      let lastTest = 0
      ipcMain.handle('tempo:test', (event) => {
        trusted(event)
        if (Date.now() - lastTest < 3000) throw new Error('提醒正在路上，等三秒再戳我。')
        lastTest = Date.now()
        notify(true)
      })
      ipcMain.handle('tempo:open', (event) => {
        trusted(event)
        return openTempo()
      })
      powerMonitor.on('resume', () => {
        void tick()
      })
      timer = setInterval(() => {
        void tick()
      }, 15_000)
      void tick()
    })
    .catch((error: unknown) => {
      dialog.showErrorBox('启动失败', String(error))
      app.quit()
    })
}
