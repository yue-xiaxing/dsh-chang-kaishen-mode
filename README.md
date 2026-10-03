# dsh-chang-kaishen-mode（常凯申模式）

一个**纯娱乐向**的 DSH 人物饰演插件。装上之后，**设置 → 通用** 里会多出一行
**「常凯申模式」**开关；打开它，AI 就会在系统提示词里收到蒋介石（常凯申）的角色
扮演提示词，并一直保持在这个角色里。

> 娱乐用途。插件会明确要求模型：不要把虚构台词说成真实历史引文，涉及历史事件时
> 区分角色扮演与有据可查的史实。

## 装上之后长什么样

```
设置
└─ 通用
   ├─ 语言
   ├─ 外观
   ├─ 输入
   └─ 常凯申模式            [ ●——]
      开启后自动向 AI 注入蒋介石（常凯申）角色扮演提示词。
      已关闭，当前与普通助手对话。对已经开始对话的会话，新开一轮或新建会话后提示词才会完整生效。
```

## 它做了什么

| 半边 | 位置 | 职责 |
|---|---|---|
| Host | `lib/index.js` | 向 `ctx.systemPrompt` 注册一个名为 `roleplay:chang-kaishen-mode` 的段落（order `11000`，排在所有官方段落之后）。段落文本是一个函数：每次组装系统提示词时才求值；关闭时返回空串，该段落在渲染阶段被丢弃，系统提示词与开启前完全一致。 |
| Client | `lib/client.js` | 把自己注册进 `settings.general.item` 槽位，渲染「常凯申模式」这一行与开关，直接读写宿主端 `chang-kaishen-mode` 设置命名空间。 |

开关与提示词正文都是 `.volatile()` 配置：

- 拨动开关**不会重挂插件**——Loader 只把新值提交进同一个配置引用，下一次组装
  prompt 立刻生效，不用重启、不用刷新页面。
- 因此关闭状态下前缀缓存不受影响（段落为空，等于不存在）。

## 配置字段

| 字段 | 默认值 | 说明 |
|---|---|---|
| `enabled` | `false` | 开关。可用设置页那行开关，也可直接改 profile patch。 |
| `prompt` | 内置角色提示词 | 注入的正文。留空则回退到内置提示词；也可以在 profile 的 patch 里整段替换成别的角色。 |

例如换一个完全不同的人物，不必改插件代码：

```yaml
- id: chang-kaishen-mode
  name: dsh-chang-kaishen-mode
  config:
    enabled: true
    prompt: |-
      You are ... (任意人物设定)
```

## 安装

插件目录需要放进 profile 的 `node_modules`，并在 profile 的 `package.json` 里登记
为 bundle（`cordis.patch.yml` 已随包提供挂载声明，bundle 安装会自动叠加）：

```powershell
$profile = "$env:USERPROFILE\.dsh\profiles\desktop"
# 1) 目录联进 profile（link: 形式，改代码即生效）
pnpm --dir $profile add link:<本插件绝对路径>
# 2) 在 profile 的 package.json 里登记 bundle：
#    "dsh": { "profile": { "bundles": [ ..., "dsh-chang-kaishen-mode" ] } }
```

**装好后需要重启一次 DeepSeek Harness（或至少刷新页面）。** 插件条目、它引入的模块，
以及浏览器端的 bundle 清单都是启动时生成的；重启后设置页里就会出现这一行。之后改开关、
改提示词都是即时的，不需要再重启。

浏览器端由 `package.json` 的 `dsh.client` 声明自动发现（`platform: "web"`），
它只从 Web 外壳的静态模块表取用三个共享模块（`react`、`react/jsx-runtime`、
`@deepseek-ai/dsh-client-ui-primitives`），不需要额外注册页面。

### 为什么随包内置了 node_modules

`node_modules/` 里放着 `@deepseek-ai/schemastery` 和它的 `@deepseek-ai/cosmokit`
（共约 136 KB）。

DSH 宿主按**普通目录**加载第三方 bundle，Node 会按插件的**真实磁盘路径**解析其中的裸
模块名；而 `@deepseek-ai/*` 这些宿主包只存在于应用安装包（`app.asar`）内部的虚拟文件
系统里，磁盘上并不存在。因此凡是装在 profile 之外的插件，都无法
`import '@deepseek-ai/schemastery'`：条目会被 Loader 判为加载失败，表现为设置页里
**那一行完全不出现**，而且界面上不会给出任何报错。

所以本插件把自己唯一需要的运行期依赖内置进来。改动 `lib/index.js` 的 `import` 时请遵守
同一原则：**只用 Node 内置模块和本包自带的依赖**。

## 已知边界

- **不改变已有会话的历史前缀。** 开关切换后，从下一轮/下一个会话开始生效；
  已发生的对话内容不会被追溯修改。
- **设置页那一行需要 `ui-settings-general` 在组合里**（桌面与 Web 的组合默认都有）。
  该槽位不存在时，插件其余部分照常工作，只是没有界面入口。
- 提示词只处理 `enabled` 与 `prompt` 两个字段，不注册工具、不联网、不落盘。

## 排查

**设置页里没有这一行**，按顺序看两处：

1. 宿主端条目有没有活起来。如果 DSH 的 Cordis 配置目录能查到
   `include:chang-kaishen-mode`，但状态是 `inactive`，说明模块没加载成功——
   绝大多数情况就是上面那条「裸模块名解析不到」。确认
   `node_modules/@deepseek-ai/schemastery` 还在本包目录里。
2. 浏览器端 bundle 有没有进清单。宿主端是活的、页面也刷新过了却仍然没有，
   说明 `dsh.client` 声明的 `./client` 产物没被采纳：检查 `package.json` 的
   `exports["./client"]` 是否指向存在的 `lib/client.js`。

## 许可

MIT
