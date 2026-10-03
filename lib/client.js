/**
 * 常凯申模式 —— 浏览器端（Client half）。
 *
 * 这是 `package.json` 里 `dsh.client` 声明的 `./client` 产物，采用 DSH 的
 * `window.__ModuleLoader__.load` 工厂格式：模块体（含注入的 <style>）只在工厂被
 * 物化时执行一次。
 *
 * 界面只有一行：设置 → 通用 里的「常凯申模式」开关，直接读写宿主端的
 * `chang-kaishen-mode` 设置命名空间（也就是插件条目的 id）。
 *
 * 外部依赖只有三个静态模块表里的共享模块（见 dsh.client.external）：
 * `react`、`react/jsx-runtime` 与 `@deepseek-ai/dsh-client-ui-primitives`。
 */
window.__ModuleLoader__.load({
  id: 'dsh-chang-kaishen-mode',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { jsx } = require('react/jsx-runtime')
    const { Switch } = require('@deepseek-ai/dsh-client-ui-primitives')

    /** 设置命名空间：等于 profile 里那个插件条目的 id。 */
    const SETTINGS_NAMESPACE = 'chang-kaishen-mode'
    /** 打开/关闭本模式的字段名。 */
    const ENABLED_FIELD = 'enabled'
    /** 本插件自己的词典命名空间。 */
    const LOCALE_NAMESPACE = 'settings.changKaishen'

    /** 简体中文文案。 */
    const zh = {
      'row.title': '常凯申模式',
      'row.description': '开启后自动向 AI 注入蒋介石（常凯申）角色扮演提示词。',
      'row.hint': '纯娱乐向。对已经开始的对话，提示词从下一轮起生效；新建会话则从头生效。',
      'row.off': '已关闭，当前与普通助手对话。',
      'row.on': '已开启。',
      'row.error': '部署没有接受这次修改，开关已回到实际状态。'
    }

    /** 英文文案。 */
    const en = {
      'row.title': 'Chiang Kai-shek Mode',
      'row.description': 'When on, the AI is automatically given the Chiang Kai-shek (常凯申) roleplay prompt.',
      'row.hint': 'Pure entertainment. In an ongoing conversation it applies from the next turn; a new session applies it from the start.',
      'row.off': 'Off — talking to the ordinary assistant.',
      'row.on': 'On.',
      'row.error': 'The deployment refused this change; the switch is back to its actual state.'
    }

    /** 跟随主题变量的一行样式，只注入一次。 */
    const CSS = [
      '.cks-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2);}',
      '.cks-rowText{min-width:0;flex:1;}',
      '.cks-title{font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);}',
      '.cks-description{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);}',
      '.cks-hint{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.cks-error{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);}'
    ].join('')

    const CSS_TAG_ID = 'dsh-chang-kaishen-mode/VolumeRow.module.css'
    if (
      typeof document !== 'undefined' &&
      document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG_ID) + ']') === null
    ) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-chang-kaishen-mode'
      tag.dataset.pluginCss = CSS_TAG_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /**
     * 从设置作用域里读出本行需要的三件事。
     *
     * 只返回原始值，因此调用方可以用它们做依赖比较。
     *
     * @param scope - `ctx.configForms.get(ns)` 返回的设置作用域。
     * @returns 开关状态、是否可写、是否已经拿到宿主快照。
     */
    function readScope(scope) {
      const snapshot = scope.getSnapshot()
      return {
        enabled: snapshot?.value?.[ENABLED_FIELD] === true,
        writable: snapshot?.writable === true,
        ready: snapshot?.status === 'ready'
      }
    }

    /**
     * 设置 → 通用 里的一行：标题、说明、状态与开关。
     *
     * 拨动时先本地点亮，再写宿主；宿主答案会经订阅回流成权威值，
     * 写入失败或部署只读时开关自动回退，并给出提示。
     *
     * @param props - `t`（词典读取器）与 `scope`（设置作用域）。
     * @returns 该行的元素树。
     */
    function VolumeRow({ t, scope }) {
      const [view, setView] = React.useState(() => readScope(scope))
      const [busy, setBusy] = React.useState(false)
      const [failed, setFailed] = React.useState(false)

      React.useEffect(
        () =>
          scope.subscribe(() => {
            setView(readScope(scope))
          }),
        [scope]
      )

      const toggle = React.useCallback(
        (next) => {
          setFailed(false)
          setBusy(true)
          setView((current) => ({ ...current, enabled: next }))
          Promise.resolve(scope.set(ENABLED_FIELD, next))
            .then((accepted) => {
              if (accepted === false) setFailed(true)
            })
            .catch(() => {
              setFailed(true)
            })
            .finally(() => {
              setBusy(false)
            })
        },
        [scope]
      )

      return jsx('div', {
        className: 'cks-row',
        children: [
          jsx('div', {
            className: 'cks-rowText',
            children: [
              jsx('div', { className: 'cks-title', children: t('row.title') }),
              jsx('div', { className: 'cks-description', children: t('row.description') }),
              jsx('div', {
                className: 'cks-hint',
                children: (view.enabled ? t('row.on') : t('row.off')) + ' ' + t('row.hint')
              }),
              failed
                ? jsx('div', { className: 'cks-error', role: 'alert', children: t('row.error') })
                : null
            ]
          }),
          jsx(Switch, {
            checked: view.enabled,
            disabled: busy || !view.writable,
            label: t('row.title'),
            onChange: toggle
          })
        ]
      })
    }

    /** 本行需要的客户端服务。 */
    const inject = ['slots', 'locale', 'configForms']

    /**
     * 注册词典与设置页那一行。
     *
     * @param ctx - 浏览器端插件上下文。
     */
    function apply(ctx) {
      const t = ctx.locale.bind(LOCALE_NAMESPACE)
      ctx.effect(
        () => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }),
        'chang-kaishen-mode: dictionaries'
      )

      const scope = ctx.configForms.get(SETTINGS_NAMESPACE)

      ctx.effect(
        () =>
          ctx.slots.inject('settings.general.item', () =>
            ctx.slots.register(
              {
                name: 'settings.general.item',
                id: 'chang-kaishen-mode',
                order: 30,
                label: () => t('row.title'),
                locale: LOCALE_NAMESPACE,
                inject: () => ({ scope })
              },
              VolumeRow
            )
          ),
        'chang-kaishen-mode: settings row'
      )
    }

    exports.SETTINGS_NAMESPACE = SETTINGS_NAMESPACE
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
