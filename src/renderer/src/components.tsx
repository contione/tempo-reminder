import { useState, type ReactNode } from 'react'
import {
  AlarmClock,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  Clock3,
  Laptop,
  ShieldCheck,
  X
} from 'lucide-react'
import type { AppState, Settings, Weekday } from '../../shared/types'

const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const englishDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

export function ActivityBar({
  help,
  onNavigate
}: {
  help: boolean
  onNavigate: (help: boolean) => void
}) {
  return (
    <aside className="activity-bar">
      <div className="app-mark" aria-label="Tempo Reminder">
        <Clock3 aria-hidden="true" />
      </div>
      <nav className="activity-actions" aria-label="主导航">
        <button
          type="button"
          className={`activity-button ${!help ? 'active' : ''}`}
          aria-label="提醒设置"
          aria-current={!help ? 'page' : undefined}
          onClick={() => onNavigate(false)}
        >
          <Bell aria-hidden="true" />
          <span className="nav-tooltip">提醒设置</span>
        </button>
        <button
          type="button"
          className={`activity-button help-button ${help ? 'active' : ''}`}
          aria-label="使用说明"
          aria-current={help ? 'page' : undefined}
          onClick={() => onNavigate(true)}
        >
          <BookOpen aria-hidden="true" />
          <span className="nav-tooltip">使用说明</span>
        </button>
      </nav>
    </aside>
  )
}

export function ScheduleEditor({
  settings,
  onChange
}: {
  settings: Settings
  onChange: (value: Settings) => void
}) {
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkTime, setBulkTime] = useState('17:00')
  const update = (day: Weekday, patch: Partial<Settings['schedule'][number]>) =>
    onChange({
      ...settings,
      schedule: settings.schedule.map((item) => (item.day === day ? { ...item, ...patch } : item))
    })
  return (
    <section className="panel schedule-panel" aria-labelledby="schedule-title">
      <div className="section-heading">
        <div>
          <h2 id="schedule-title">每周提醒计划</h2>
          <p className="section-description">选好时间，剩下的交给我。</p>
        </div>
        <div className="bulk-anchor">
          <button
            type="button"
            className="button small"
            aria-expanded={bulkOpen}
            onClick={() => setBulkOpen(!bulkOpen)}
          >
            <Clock3 size={16} />
            统一时间
          </button>
          {bulkOpen ? (
            <div
              className="bulk-popover"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setBulkOpen(false)
              }}
            >
              <div className="bulk-heading">
                <label htmlFor="bulk-time">应用到已选日期</label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="关闭统一时间"
                  onClick={() => setBulkOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <input
                id="bulk-time"
                type="time"
                value={bulkTime}
                onChange={(event) => setBulkTime(event.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="button primary small"
                disabled={!bulkTime}
                onClick={() => {
                  onChange({
                    ...settings,
                    schedule: settings.schedule.map((item) =>
                      item.enabled ? { ...item, time: bulkTime } : item
                    )
                  })
                  setBulkOpen(false)
                }}
              >
                应用时间
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="schedule-list">
        {order.map((day) => {
          const item = settings.schedule.find((row) => row.day === day)!
          return (
            <div key={day} className={`day-row ${item.enabled ? '' : 'day-disabled'}`}>
              <input
                className="checkbox"
                id={`day-${day}`}
                type="checkbox"
                aria-label={`${labels[day]}提醒`}
                checked={item.enabled}
                onChange={(event) => update(day, { enabled: event.target.checked })}
              />
              <label className="day-label" htmlFor={`day-${day}`}>
                {labels[day]}
                <span>{englishDays[day]}</span>
              </label>
              <input
                className="time-input"
                type="time"
                aria-label={`${labels[day]}提醒时间`}
                value={item.time}
                disabled={!item.enabled}
                required
                onChange={(event) => update(day, { time: event.target.value })}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AnalogClock({ date }: { date: Date }) {
  const hourAngle = (date.getHours() % 12) * 30 + date.getMinutes() * 0.5
  const minuteAngle = date.getMinutes() * 6
  return (
    <svg className="analog-clock" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="57" className="clock-face" />
      {Array.from({ length: 12 }, (_, tick) => (
        <line
          key={tick}
          x1="60"
          y1="10"
          x2="60"
          y2={tick % 3 === 0 ? '17' : '14'}
          transform={`rotate(${tick * 30} 60 60)`}
          className="clock-tick"
        />
      ))}
      <text x="60" y="23">
        12
      </text>
      <text x="99" y="64">
        3
      </text>
      <text x="60" y="106">
        6
      </text>
      <text x="21" y="64">
        9
      </text>
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="34"
        transform={`rotate(${hourAngle} 60 60)`}
        className="hour-hand"
      />
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="28"
        transform={`rotate(${minuteAngle} 60 60)`}
        className="minute-hand"
      />
      <circle cx="60" cy="60" r="2.5" fill="#cbdcff" />
    </svg>
  )
}

export function Overview({ state, dirty }: { state: AppState; dirty: boolean }) {
  const next = state.nextReminder ? new Date(state.nextReminder) : null
  const time = next?.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const date = next?.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  return (
    <aside className="overview-column" aria-label="提醒概览">
      <section className={`time-panel ${next ? '' : 'time-panel-paused'}`}>
        <h2 className="time-panel-title">
          <Bell aria-hidden="true" />
          下一次提醒
        </h2>
        <div className="time-display">
          <div className={`next-time ${next ? '' : 'no-next'}`}>
            {time ?? (state.settings.enabled ? '未安排' : '已暂停')}
          </div>
          {next ? (
            <AnalogClock date={next} />
          ) : (
            <div className="paused-clock">
              <Clock3 />
            </div>
          )}
        </div>
        <p className="next-date">
          {date ?? (state.settings.enabled ? '选择需要提醒的日期' : '让提醒也休息一下')}
        </p>
        <p className="timezone">
          {dirty ? '按已保存的计划 · 保存后生效' : `本地时间 · ${state.device.timezone}`}
        </p>
        <p className="time-reassurance">
          {next ? '到点叫你，安心忙吧。' : '准备好时，随时再出发。'}
        </p>
      </section>
      <section className="panel device-panel" aria-labelledby="device-title">
        <h2 id="device-title">当前设备</h2>
        <div className="device-content">
          <Laptop className="device-icon" aria-hidden="true" />
          <div className="device-details">
            <dl>
              <div>
                <dt>系统用户名</dt>
                <dd title={state.device.username}>{state.device.username}</dd>
              </div>
              <div>
                <dt>电脑名称</dt>
                <dd title={state.device.hostname}>{state.device.hostname}</dd>
              </div>
            </dl>
            <p className="privacy-note">
              <ShieldCheck size={13} />
              仅在本机显示。
            </p>
          </div>
        </div>
      </section>
    </aside>
  )
}

export function TempoLink({
  value,
  onChange,
  canOpen,
  onOpen,
  children
}: {
  value: string
  onChange: (value: string) => void
  canOpen: boolean
  onOpen: () => void
  children: ReactNode
}) {
  return (
    <section className="panel link-panel">
      <div className="section-heading">
        <h2>
          <label htmlFor="tempo-url">Tempo 页面地址</label>
        </h2>
        <button type="button" className="text-button" disabled={!canOpen} onClick={onOpen}>
          打开 Tempo
          <ArrowUpRight size={17} />
        </button>
      </div>
      <input
        id="tempo-url"
        className="url-input"
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://your-company.atlassian.net/..."
        spellCheck={false}
        autoComplete="off"
        aria-describedby="url-hint"
      />
      <p id="url-hint">粘贴你的工时页面，提醒后就能一键抵达。</p>
      {children}
    </section>
  )
}

export function Help() {
  return (
    <div className="help-content">
      <section className="panel help-panel">
        <h2>让工时，准点下班。</h2>
        <p className="help-lead">三件小事，把「明天再填」留在昨天。</p>
        <ol className="help-steps">
          <li>
            <span>01</span>
            <div>
              <h3>选好你的提醒时间</h3>
              <p>默认周一至周五 17:00。每天都能单独调整，也可以用「统一时间」一起设置。</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>粘贴 Tempo 页面地址</h3>
              <p>
                在浏览器打开公司 Jira 的 Tempo 工时页，复制完整地址。操作系统用户名不等于 Jira
                账号，登录由浏览器处理。
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>保存，然后安心工作</h3>
              <p>
                到点会弹出系统通知，点击直接前往 Tempo。试试「发送测试提醒」，提前认识你的下班搭子。
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section className="help-notes">
        <h2>几个小约定</h2>
        <p>
          <Check size={17} />
          关闭窗口后，应用继续在系统托盘运行；彻底退出后停止提醒。
        </p>
        <p>
          <Check size={17} />
          每天最多一次自动提醒。当天错过时间，启动或唤醒电脑时补提醒。
        </p>
        <p>
          <Check size={17} />
          按电脑本地时间和所选星期执行，不自动识别法定节假日或调休。
        </p>
        <p>
          <Check size={17} />
          这里只提醒，不检查或提交工时，也不上传你的用户名和电脑名称。
        </p>
        <p>
          <AlarmClock size={17} />
          没收到通知？检查系统通知权限和勿扰模式。Windows 建议安装后使用。
        </p>
      </section>
    </div>
  )
}
