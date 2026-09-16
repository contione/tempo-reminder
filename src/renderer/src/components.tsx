import { useState } from 'react'
import {
  AlarmClock,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  Clock3,
  Laptop,
  Settings2,
  ShieldCheck,
  X
} from 'lucide-react'
import type { AppState, Settings, Weekday } from '../../shared/types'

const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

export function Sidebar({
  help,
  onNavigate
}: {
  help: boolean
  onNavigate: (help: boolean) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Clock3 aria-hidden="true" />
        <span>Tempo Reminder</span>
      </div>
      <nav aria-label="主导航">
        <button
          className={!help ? 'nav-item active' : 'nav-item'}
          onClick={() => onNavigate(false)}
          aria-current={!help ? 'page' : undefined}
        >
          <Settings2 />
          提醒设置
        </button>
        <button
          className={help ? 'nav-item active' : 'nav-item'}
          onClick={() => onNavigate(true)}
          aria-current={help ? 'page' : undefined}
        >
          <BookOpen />
          使用说明
        </button>
      </nav>
      <div className="sidebar-footer">
        <span className="running-dot" />
        应用正在运行<span className="version">v0.1.0</span>
      </div>
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
        <h2 id="schedule-title">提醒计划</h2>
        <div className="bulk-anchor">
          <button
            type="button"
            className="button small subtle"
            aria-expanded={bulkOpen}
            onClick={() => setBulkOpen(!bulkOpen)}
          >
            <Clock3 size={15} />
            统一时间
          </button>
          {bulkOpen ? (
            <div className="bulk-popover">
              <div className="bulk-heading">
                <label htmlFor="bulk-time">应用到已选日期</label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="关闭统一时间"
                  onClick={() => setBulkOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <input
                id="bulk-time"
                type="time"
                value={bulkTime}
                onChange={(event) => setBulkTime(event.target.value)}
                required
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
              <label className="day-label" htmlFor={`day-${day}`}>
                {labels[day]}
              </label>
              <input
                className="checkbox"
                id={`day-${day}`}
                type="checkbox"
                aria-label={`${labels[day]}提醒`}
                checked={item.enabled}
                onChange={(event) => update(day, { enabled: event.target.checked })}
              />
              <input
                className="time-input"
                type="time"
                aria-label={`${labels[day]}提醒时间`}
                value={item.time}
                disabled={!item.enabled}
                required
                onChange={(event) => update(day, { time: event.target.value })}
              />
              <span className="day-state">{item.enabled ? '提醒我' : '休息一下'}</span>
            </div>
          )
        })}
      </div>
    </section>
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
    <aside className="panel overview" aria-label="提醒概览">
      <div className="overview-title">
        <h2>下一次提醒</h2>
        <Bell size={19} />
      </div>
      <div className={`next-time ${next ? '' : 'no-next'}`}>
        {time ?? (state.settings.enabled ? '未安排' : '已暂停')}
      </div>
      <p className="next-date">
        {date ?? (state.settings.enabled ? '选择需要提醒的日期' : '开启后，继续准时见面')}
      </p>
      <p className="timezone">
        <span className="tiny-dot" />
        {dirty ? '按已保存的计划' : `本地时间 · ${state.device.timezone}`}
      </p>
      <div className="device-block">
        <div className="device-heading">
          <h2>本机信息</h2>
          <Laptop size={18} />
        </div>
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
          <ShieldCheck size={14} />
          自动读取，仅在本机显示
        </p>
      </div>
    </aside>
  )
}

export function TempoLink({
  value,
  onChange,
  canOpen,
  onOpen
}: {
  value: string
  onChange: (value: string) => void
  canOpen: boolean
  onOpen: () => void
}) {
  return (
    <section className="panel link-panel">
      <div className="section-heading">
        <h2>
          <label htmlFor="tempo-url">Tempo 页面地址</label>
        </h2>
        <button type="button" className="text-button" disabled={!canOpen} onClick={onOpen}>
          打开 Tempo
          <ArrowUpRight size={16} />
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
      <p id="url-hint">粘贴你的工时页面地址，提醒后就能一键抵达。可以稍后再设置。</p>
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
          <Check size={16} />
          关闭窗口后，应用继续在系统托盘运行；彻底退出后停止提醒。
        </p>
        <p>
          <Check size={16} />
          每天最多一次自动提醒。当天错过时间，启动或唤醒电脑时补提醒。
        </p>
        <p>
          <Check size={16} />
          按电脑本地时间和所选星期执行，不自动识别法定节假日或调休。
        </p>
        <p>
          <Check size={16} />
          这里只提醒，不检查或提交工时，也不上传你的用户名和电脑名称。
        </p>
        <p>
          <AlarmClock size={16} />
          没收到通知？检查系统通知权限和勿扰模式。Windows 建议安装后使用。
        </p>
      </section>
    </div>
  )
}
