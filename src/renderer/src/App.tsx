import { useEffect, useRef, useState } from 'react'
import { BellRing, Check, CircleAlert, LoaderCircle, Save, X } from 'lucide-react'
import type { AppState, Settings } from '../../shared/types'
import { Help, Overview, ScheduleEditor, Sidebar, TempoLink } from './components'

function message(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(
    /^Error invoking remote method '[^']+': (Error: )?/,
    ''
  )
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [draft, setDraft] = useState<Settings | null>(null)
  const [help, setHelp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const saved = useRef<Settings | null>(null)

  useEffect(() => {
    let active = true
    async function refresh() {
      if (!window.tempo) {
        setLoadError('请从桌面应用打开 Tempo Reminder，才能读取本机信息和发送系统通知。')
        return
      }
      try {
        const next = await window.tempo.getState()
        if (!active) return
        const previous = saved.current
        saved.current = next.settings
        setState(next)
        setDraft((current) =>
          !current || JSON.stringify(current) === JSON.stringify(previous) ? next.settings : current
        )
        setLoadError('')
      } catch (error) {
        if (active) setLoadError(message(error))
      }
    }
    void refresh()
    const timer = setInterval(() => {
      void refresh()
    }, 15_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!notice || notice.error) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const dirty = Boolean(draft && JSON.stringify(draft) !== JSON.stringify(state?.settings))

  async function save() {
    if (!draft || !window.tempo) return
    setBusy(true)
    try {
      const next = await window.tempo.saveSettings(draft)
      saved.current = next.settings
      setState(next)
      setDraft(next.settings)
      setNotice({ text: '设置已保存。放心工作，到点叫你。', error: false })
    } catch (error) {
      setNotice({ text: message(error), error: true })
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    if (!window.tempo) return
    setTesting(true)
    try {
      await window.tempo.testReminder()
      setNotice({ text: '测试提醒已发送。看一眼系统通知，和下班搭子打个招呼。', error: false })
    } catch (error) {
      setNotice({ text: message(error), error: true })
    } finally {
      setTesting(false)
    }
  }

  async function open() {
    try {
      await window.tempo?.openTempo()
    } catch (error) {
      setNotice({ text: message(error), error: true })
    }
  }

  return (
    <div className="app-shell">
      <Sidebar help={help} onNavigate={setHelp} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{help ? '使用说明' : '工时提醒'}</h1>
            <p>{help ? '你的下班搭子，使用起来就这么简单。' : '下班前，留一点时间记录今天。'}</p>
          </div>
          {!help && draft ? (
            <label className="master-toggle">
              <input
                type="checkbox"
                role="switch"
                aria-label="开启工时提醒"
                checked={draft.enabled}
                disabled={busy}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
              />
              <span className="switch-track" />
              <span>{draft.enabled ? '已开启' : '已暂停'}</span>
            </label>
          ) : null}
        </header>
        {loadError ? (
          <div className="inline-alert" role="alert">
            <CircleAlert size={18} />
            {loadError}
          </div>
        ) : null}
        {!state || !draft ? (
          !loadError ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              正在读取本机设置…
            </div>
          ) : null
        ) : help ? (
          <Help />
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            {state.storageWarning ? (
              <div className="inline-alert" role="alert">
                <CircleAlert size={18} />
                {state.storageWarning}
              </div>
            ) : null}
            {!state.notificationSupported ? (
              <div className="inline-alert">系统通知暂不可用，到点会在应用窗口提醒你。</div>
            ) : null}
            <fieldset disabled={busy}>
              <div className="settings-grid">
                <ScheduleEditor settings={draft} onChange={setDraft} />
                <Overview state={state} dirty={dirty} />
              </div>
              <TempoLink
                value={draft.tempoUrl}
                onChange={(tempoUrl) => setDraft({ ...draft, tempoUrl })}
                canOpen={
                  Boolean(state.settings.tempoUrl) && state.settings.tempoUrl === draft.tempoUrl
                }
                onOpen={() => {
                  void open()
                }}
              />
              <footer className="form-footer">
                <label
                  className={`login-option ${state.launchAtLoginSupported ? '' : 'unavailable'}`}
                  title={
                    state.launchAtLoginSupported
                      ? '登录电脑时自动启动并在托盘运行'
                      : '安装版 Windows / macOS 支持此功能'
                  }
                >
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={draft.launchAtLogin}
                    disabled={!state.launchAtLoginSupported}
                    onChange={(event) =>
                      setDraft({ ...draft, launchAtLogin: event.target.checked })
                    }
                  />
                  开机启动{!state.launchAtLoginSupported ? <span>安装版可用</span> : null}
                </label>
                <div className="form-actions">
                  <span className={`save-state ${dirty ? 'unsaved' : ''}`}>
                    {dirty ? '有未保存的更改' : '设置已同步'}
                  </span>
                  <button className="button primary" type="submit" disabled={busy}>
                    {busy ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}
                    保存设置
                  </button>
                  <button
                    className="button"
                    type="button"
                    disabled={testing || busy}
                    onClick={() => {
                      void test()
                    }}
                  >
                    <BellRing size={17} />
                    {testing ? '正在发送…' : '发送测试提醒'}
                  </button>
                </div>
              </footer>
              <p className="footer-note">关闭窗口后仍在托盘提醒。工时不蒸发，下班才潇洒。</p>
            </fieldset>
          </form>
        )}
      </main>
      {notice ? (
        <div
          className={`toast ${notice.error ? 'toast-error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.error ? <CircleAlert size={19} /> : <Check size={19} />}
          <span>{notice.text}</span>
          <button className="icon-button" aria-label="关闭提示" onClick={() => setNotice(null)}>
            <X size={17} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
