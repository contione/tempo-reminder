import type { DaySchedule, Settings, Weekday } from '../shared/types'

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string): never {
  throw new TypeError(`设置无效：${message}`)
}

export function defaultSettings(): Settings {
  const schedule: DaySchedule[] = Array.from({ length: 7 }, (_, day) => ({
    day: day as Weekday,
    enabled: day >= 1 && day <= 5,
    time: '17:00'
  }))

  return {
    version: 1,
    enabled: true,
    schedule,
    tempoUrl: '',
    launchAtLogin: false
  }
}

export function validateSettings(input: unknown): Settings {
  if (!isRecord(input)) {
    invalid('必须是对象')
  }

  if (input.version !== 1) {
    invalid('版本必须为 1')
  }

  if (typeof input.enabled !== 'boolean') {
    invalid('提醒总开关必须是布尔值')
  }

  if (typeof input.launchAtLogin !== 'boolean') {
    invalid('开机启动开关必须是布尔值')
  }

  if (!Array.isArray(input.schedule) || input.schedule.length !== 7) {
    invalid('必须配置完整的 7 天提醒计划')
  }

  const seenDays = new Set<number>()
  const schedule: DaySchedule[] = input.schedule.map((entry, index) => {
    if (!isRecord(entry)) {
      invalid(`第 ${index + 1} 天计划必须是对象`)
    }

    const { day, enabled, time } = entry
    if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) {
      invalid(`第 ${index + 1} 天的星期编号必须是 0 到 6 的整数`)
    }
    if (seenDays.has(day)) {
      invalid(`星期 ${day} 的计划重复了`)
    }
    seenDays.add(day)

    if (typeof enabled !== 'boolean') {
      invalid(`第 ${index + 1} 天的启用状态必须是布尔值`)
    }
    if (typeof time !== 'string' || !TIME_PATTERN.test(time)) {
      invalid(`第 ${index + 1} 天的时间必须是 HH:mm 格式`)
    }

    return { day: day as Weekday, enabled, time }
  })

  if (typeof input.tempoUrl !== 'string') {
    invalid('Tempo 地址必须是文本')
  }
  const tempoUrl = input.tempoUrl.trim()
  if (tempoUrl.length > 0) {
    let parsed: URL
    try {
      parsed = new URL(tempoUrl)
    } catch {
      invalid('Tempo 地址格式不正确')
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      invalid('Tempo 地址仅支持 HTTP 或 HTTPS')
    }
    if (parsed.username || parsed.password) {
      invalid('Tempo 地址不能包含用户名或密码')
    }
  }

  return {
    version: 1,
    enabled: input.enabled,
    schedule,
    tempoUrl,
    launchAtLogin: input.launchAtLogin
  }
}
