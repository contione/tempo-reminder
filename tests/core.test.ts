import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { defaultSettings, validateSettings } from '../src/core/settings'
import { dueReminder, localDateKey, nextReminderAt } from '../src/core/scheduler'
import { SettingsStore } from '../src/core/store'
import type { ReminderHistory, Settings } from '../src/shared/types'

const temporaryDirectories: string[] = []

function atLocal(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  return new Date(year, month - 1, day, hour, minute, second, 0)
}

function history(lastReminderDate: string | null = null): ReminderHistory {
  return {
    lastReminderDate,
    lastReminderAt: lastReminderDate ? `${lastReminderDate}T17:00:00` : null
  }
}

function settingsWith(
  changes: Partial<Pick<Settings, 'enabled' | 'tempoUrl' | 'launchAtLogin'>> = {},
  dayChanges: Partial<
    Record<0 | 1 | 2 | 3 | 4 | 5 | 6, Partial<{ enabled: boolean; time: string }>>
  > = {}
): Settings {
  const settings = defaultSettings()
  Object.assign(settings, changes)
  settings.schedule = settings.schedule.map((entry) => ({
    ...entry,
    ...dayChanges[entry.day]
  }))
  return settings
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe('scheduler', () => {
  it('uses local date keys and weekday boundaries', () => {
    expect(localDateKey(atLocal(2026, 1, 1, 23, 59))).toBe('2026-01-01')
    const mondayBefore = atLocal(2026, 1, 5, 16, 59, 59)
    const mondayAtFive = atLocal(2026, 1, 5, 17, 0)
    const saturday = atLocal(2026, 1, 10, 18, 0)

    expect(dueReminder(defaultSettings(), history(), mondayBefore)).toBe(false)
    expect(dueReminder(defaultSettings(), history(), mondayAtFive)).toBe(true)
    expect(dueReminder(defaultSettings(), history(), saturday)).toBe(false)
  })

  it('honors global pause, per-day pause, and same-day deduplication', () => {
    const monday = atLocal(2026, 1, 5, 18, 0)
    expect(dueReminder(settingsWith({ enabled: false }), history(), monday)).toBe(false)
    expect(dueReminder(settingsWith({}, { 1: { enabled: false } }), history(), monday)).toBe(false)
    expect(dueReminder(defaultSettings(), history('2026-01-05'), monday)).toBe(false)
  })

  it('returns now for a missed reminder, then finds the next enabled day', () => {
    const monday = atLocal(2026, 1, 5, 18, 12)
    expect(nextReminderAt(defaultSettings(), history(), monday)?.getTime()).toBe(monday.getTime())

    const tuesday = atLocal(2026, 1, 6, 9, 0)
    expect(nextReminderAt(defaultSettings(), history('2026-01-05'), tuesday)).toEqual(
      atLocal(2026, 1, 6, 17, 0)
    )

    const fridayAfter = atLocal(2026, 1, 9, 18, 0)
    expect(nextReminderAt(defaultSettings(), history('2026-01-09'), fridayAfter)).toEqual(
      atLocal(2026, 1, 12, 17, 0)
    )
  })

  it('handles year-end rollover and a schedule with no enabled days', () => {
    const settings = settingsWith(
      {},
      {
        5: { enabled: true, time: '17:00' },
        1: { enabled: false },
        2: { enabled: false },
        3: { enabled: false },
        4: { enabled: false }
      }
    )
    const friday = atLocal(2027, 1, 1, 18, 0)
    expect(nextReminderAt(settings, history('2027-01-01'), friday)).toEqual(
      atLocal(2027, 1, 8, 17, 0)
    )

    const none = settingsWith()
    none.schedule = none.schedule.map((entry) => ({ ...entry, enabled: false }))
    expect(nextReminderAt(none, history(), friday)).toBeNull()
  })
})

describe('settings validation', () => {
  it('returns weekday defaults and trims a valid Tempo URL', () => {
    const defaults = defaultSettings()
    expect(defaults.schedule.filter((entry) => entry.enabled).map((entry) => entry.day)).toEqual([
      1, 2, 3, 4, 5
    ])
    expect(
      validateSettings({ ...defaults, tempoUrl: ' https://tempo.example.test/work ' }).tempoUrl
    ).toBe('https://tempo.example.test/work')
  })

  it('rejects malformed schedules, flags, versions, times, and credential URLs', () => {
    const defaults = defaultSettings()
    expect(() => validateSettings({ ...defaults, version: 2 })).toThrow()
    expect(() => validateSettings({ ...defaults, enabled: 'true' })).toThrow()
    expect(() =>
      validateSettings({ ...defaults, schedule: defaults.schedule.slice(0, 6) })
    ).toThrow()
    expect(() =>
      validateSettings({
        ...defaults,
        schedule: defaults.schedule.map((entry, index) =>
          index === 6 ? { ...entry, day: 5 } : entry
        )
      })
    ).toThrow()
    expect(() =>
      validateSettings({
        ...defaults,
        schedule: defaults.schedule.map((entry, index) =>
          index === 0 ? { ...entry, time: '17:60' } : entry
        )
      })
    ).toThrow()
    expect(() =>
      validateSettings({ ...defaults, tempoUrl: 'https://user:pass@tempo.example.test' })
    ).toThrow()
    expect(() => validateSettings({ ...defaults, tempoUrl: 'file:///tmp/tempo' })).toThrow()
  })
})

describe('SettingsStore', () => {
  it('persists settings and history in separate files with normalized settings', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tempo-reminder-'))
    temporaryDirectories.push(directory)
    const store = new SettingsStore(directory)
    const settings = settingsWith({ tempoUrl: ' https://tempo.example.test ' })
    await store.saveSettings(settings)
    await store.saveHistory(history('2026-01-05'))

    const loaded = await store.load()
    expect(loaded.settings.tempoUrl).toBe('https://tempo.example.test')
    expect(loaded.history.lastReminderDate).toBe('2026-01-05')
    expect(await readFile(join(directory, 'settings.json'), 'utf8')).toContain('"version": 1')
    expect(await readFile(join(directory, 'history.json'), 'utf8')).toContain('2026-01-05')
  })

  it('backs up corrupted files, restores defaults, and reports a warning', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tempo-reminder-'))
    temporaryDirectories.push(directory)
    await writeFile(join(directory, 'settings.json'), '{not-json', 'utf8')
    await writeFile(
      join(directory, 'history.json'),
      JSON.stringify({ lastReminderDate: 42 }),
      'utf8'
    )

    const loaded = await new SettingsStore(directory).load()
    expect(loaded.settings).toEqual(defaultSettings())
    expect(loaded.history).toEqual({ lastReminderDate: null, lastReminderAt: null })
    expect(loaded.warning).toContain('settings.json')
    expect(loaded.warning).toContain('history.json')
    const files = await readdir(directory)
    expect(files.some((file) => file === 'settings.json.bak')).toBe(true)
    expect(files.some((file) => file === 'history.json.bak')).toBe(true)
    expect(JSON.parse(await readFile(join(directory, 'settings.json'), 'utf8'))).toEqual(
      defaultSettings()
    )
  })

  it('rejects invalid history dates, times, and half-empty records', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tempo-reminder-'))
    temporaryDirectories.push(directory)
    const store = new SettingsStore(directory)

    await store.saveHistory({
      lastReminderDate: '2024-02-29',
      lastReminderAt: '2024-02-29T09:00:00.000Z'
    })
    expect((await store.load()).history.lastReminderDate).toBe('2024-02-29')

    await expect(
      store.saveHistory({
        lastReminderDate: '2025-02-29',
        lastReminderAt: '2025-03-01T09:00:00.000Z'
      })
    ).rejects.toThrow('YYYY-MM-DD')
    await expect(
      store.saveHistory({
        lastReminderDate: '2025-03-01',
        lastReminderAt: 'not-a-time'
      })
    ).rejects.toThrow('可解析')
    await expect(
      store.saveHistory({ lastReminderDate: '2025-03-01', lastReminderAt: null })
    ).rejects.toThrow('同时为空')
    await expect(
      store.saveHistory({ lastReminderDate: null, lastReminderAt: '2025-03-01T09:00:00Z' })
    ).rejects.toThrow('同时为空')
  })

  it('backs up a history file containing invalid date or time strings', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tempo-reminder-'))
    temporaryDirectories.push(directory)
    await writeFile(
      join(directory, 'history.json'),
      JSON.stringify({ lastReminderDate: '2025-02-29', lastReminderAt: 'not-a-time' }),
      'utf8'
    )

    const loaded = await new SettingsStore(directory).load()
    expect(loaded.history).toEqual({ lastReminderDate: null, lastReminderAt: null })
    expect(loaded.warning).toContain('提醒历史')
    expect((await readdir(directory)).some((file) => file === 'history.json.bak')).toBe(true)
  })

  it('propagates write failures when the storage directory is a regular file', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'tempo-reminder-'))
    temporaryDirectories.push(parent)
    const filePath = join(parent, 'storage-file')
    await writeFile(filePath, 'not a directory', 'utf8')
    const store = new SettingsStore(filePath)

    await expect(store.saveSettings(defaultSettings())).rejects.toThrow()
    await expect(
      store.saveHistory({ lastReminderDate: null, lastReminderAt: null })
    ).rejects.toThrow()
  })
})
