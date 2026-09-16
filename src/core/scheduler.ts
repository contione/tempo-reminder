import type { DaySchedule, ReminderHistory, Settings } from '../shared/types'

function assertValidDate(value: Date): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError('now must be a valid Date')
  }
}

function scheduleFor(settings: Settings, day: number): DaySchedule | undefined {
  return settings.schedule.find((entry) => entry.day === day && entry.enabled)
}

function scheduleDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0)
}

export function localDateKey(date: Date): string {
  assertValidDate(date)
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dueReminder(settings: Settings, history: ReminderHistory, now: Date): boolean {
  assertValidDate(now)
  if (!settings.enabled) {
    return false
  }

  const today = localDateKey(now)
  if (history.lastReminderDate === today) {
    return false
  }

  const todaySchedule = scheduleFor(settings, now.getDay())
  if (!todaySchedule) {
    return false
  }

  return now.getTime() >= scheduleDate(now, todaySchedule.time).getTime()
}

export function nextReminderAt(
  settings: Settings,
  history: ReminderHistory,
  now: Date
): Date | null {
  assertValidDate(now)
  if (!settings.enabled) {
    return null
  }

  const enabledDays = settings.schedule.filter((entry) => entry.enabled)
  if (enabledDays.length === 0) {
    return null
  }

  const todayKey = localDateKey(now)
  const todaySchedule = scheduleFor(settings, now.getDay())
  if (todaySchedule && history.lastReminderDate !== todayKey) {
    const todayReminder = scheduleDate(now, todaySchedule.time)
    if (now.getTime() < todayReminder.getTime()) {
      return todayReminder
    }
    return new Date(now.getTime())
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidateDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      12,
      0,
      0,
      0
    )
    const candidateSchedule = scheduleFor(settings, candidateDay.getDay())
    if (!candidateSchedule) {
      continue
    }

    if (localDateKey(candidateDay) === history.lastReminderDate) {
      continue
    }

    return scheduleDate(candidateDay, candidateSchedule.time)
  }

  return null
}
