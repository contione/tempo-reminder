import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { defaultSettings, validateSettings } from './settings'
import type { ReminderHistory, Settings } from '../shared/types'

const SETTINGS_FILE = 'settings.json'
const HISTORY_FILE = 'history.json'

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}

function isMissing(value: unknown): boolean {
  return isNodeError(value) && value.code === 'ENOENT'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function defaultHistory(): ReminderHistory {
  return { lastReminderDate: null, lastReminderAt: null }
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function isRealDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value)
  if (!match) {
    return false
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }

  const candidate = new Date(0)
  candidate.setHours(0, 0, 0, 0)
  candidate.setFullYear(year, month - 1, day)
  candidate.setHours(0, 0, 0, 0)
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  )
}

function validateHistory(input: unknown): ReminderHistory {
  if (!isRecord(input)) {
    throw new TypeError('提醒历史必须是对象')
  }

  const { lastReminderDate, lastReminderAt } = input
  const dateIsNull = lastReminderDate === null
  const timeIsNull = lastReminderAt === null
  if (dateIsNull !== timeIsNull) {
    throw new TypeError('提醒日期和提醒时间必须同时为空或同时有效')
  }
  if (dateIsNull && timeIsNull) {
    return { lastReminderDate: null, lastReminderAt: null }
  }

  if (typeof lastReminderDate !== 'string' || !isRealDateKey(lastReminderDate)) {
    throw new TypeError('最后提醒日期必须是有效的 YYYY-MM-DD 日期')
  }
  if (
    typeof lastReminderAt !== 'string' ||
    lastReminderAt.trim().length === 0 ||
    !Number.isFinite(Date.parse(lastReminderAt))
  ) {
    throw new TypeError('最后提醒时间必须是可解析的时间')
  }

  return { lastReminderDate, lastReminderAt }
}

async function atomicWrite(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
  const contents = `${JSON.stringify(value, null, 2)}\n`

  try {
    await writeFile(temporaryPath, contents, 'utf8')
    await rename(temporaryPath, filePath)
  } catch (error) {
    try {
      await unlink(temporaryPath)
    } catch {
      // Preserve the original write or rename error.
    }
    throw error
  }
}

async function availableBackupPath(filePath: string): Promise<string> {
  const firstChoice = `${filePath}.bak`
  try {
    await access(firstChoice)
  } catch (error) {
    if (isMissing(error)) {
      return firstChoice
    }
    throw error
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${firstChoice}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    try {
      await access(candidate)
    } catch (error) {
      if (isMissing(error)) {
        return candidate
      }
      throw error
    }
  }

  throw new Error(`Could not allocate a backup path for ${filePath}`)
}

async function readText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (isMissing(error)) {
      return null
    }
    throw error
  }
}

export class SettingsStore {
  private readonly directory: string

  constructor(directory: string) {
    this.directory = directory
  }

  async load(): Promise<{
    settings: Settings
    history: ReminderHistory
    warning: string | null
  }> {
    const warnings: string[] = []
    const settingsPath = join(this.directory, SETTINGS_FILE)
    const historyPath = join(this.directory, HISTORY_FILE)

    const settingsText = await readText(settingsPath)
    let settings: Settings
    if (settingsText === null) {
      settings = defaultSettings()
    } else {
      try {
        settings = validateSettings(JSON.parse(settingsText) as unknown)
      } catch {
        const backupPath = await availableBackupPath(settingsPath)
        await rename(settingsPath, backupPath)
        settings = defaultSettings()
        await atomicWrite(settingsPath, settings)
        warnings.push(
          `设置文件 ${basename(settingsPath)} 无效，已备份并恢复默认设置（备份：${basename(
            backupPath
          )}）。`
        )
      }
    }

    const historyText = await readText(historyPath)
    let history: ReminderHistory
    if (historyText === null) {
      history = defaultHistory()
    } else {
      try {
        history = validateHistory(JSON.parse(historyText) as unknown)
      } catch {
        const backupPath = await availableBackupPath(historyPath)
        await rename(historyPath, backupPath)
        history = defaultHistory()
        await atomicWrite(historyPath, history)
        warnings.push(
          `提醒历史 ${basename(historyPath)} 无效，已备份并清空记录（备份：${basename(
            backupPath
          )}）。`
        )
      }
    }

    return { settings, history, warning: warnings.length > 0 ? warnings.join(' ') : null }
  }

  async saveSettings(settings: Settings): Promise<void> {
    const validated = validateSettings(settings)
    await atomicWrite(join(this.directory, SETTINGS_FILE), validated)
  }

  async saveHistory(history: ReminderHistory): Promise<void> {
    const validated = validateHistory(history)
    await atomicWrite(join(this.directory, HISTORY_FILE), validated)
  }
}
