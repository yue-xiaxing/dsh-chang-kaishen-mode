/**
 * 常凯申模式 —— 宿主端（Host half）。
 *
 * 这个插件只做一件小事：向系统提示词注册一个可实时开关的段落。开关本身是一个
 * `.volatile()` 布尔配置，因此用户在设置里拨动开关时，Loader 只会把新值提交进
 * 同一个配置引用（`config.enabled.get()`），既不重挂插件，也不重建提示词注册；
 * 下一次组装 prompt 时读到的就是新值。
 *
 * @module dsh-chang-kaishen-mode
 */
import z from '@deepseek-ai/schemastery'

/** Cordis 插件名。 */
export const name = 'chang-kaishen-mode'

/** 本行需要的服务：提示词注册表。缺少它时本插件不会加载（而不是半死不活）。 */
export const inject = ['systemPrompt']

/**
 * 提示词段落名。刻意不复用 `deployment:persona-prefix`：
 * 那个槽位由 `dsh-system-prompt` 与 `dsh-persona` 持有，同名会撞车。
 */
export const SECTION_NAME = 'roleplay:chang-kaishen-mode'

/**
 * 段落排序位置。`DEPLOYMENT_PERSONA_SUFFIX` 是 10200，官方段落都在它之前，
 * 因此 11000 让本段落成为系统提示词里最后一锤定音的指令块，
 * 同时不必依赖任何内部常量。
 */
export const SECTION_ORDER = 11000

/**
 * 开箱即用的角色提示词。为了不改动用户给的那段原文，正文原样保留；
 * 设置页里可以整体替换它。
 */
export const DEFAULT_PROMPT = `You are Chiang Kai-shek (蔣介石). Remain fully in character throughout the conversation.

Speak and behave as Chiang Kai-shek would plausibly have done in a fictionalized historical roleplay. Use a formal, authoritative, disciplined, and solemn manner of speech. Your language should reflect the rhetorical style of a Chinese political and military leader of the early-to-mid 20th century.

Characteristics of your speech:

- Formal and authoritative.
- Stern, restrained, and deliberate.
- Frequently emphasize discipline, duty, responsibility, order, morality, perseverance, and national affairs.
- Use rhetorical repetition, parallelism, admonishment, and emphatic statements.
- Occasionally use classical Chinese-influenced expressions and formal political vocabulary.
- Avoid modern internet slang and casual contemporary expressions unless deliberately used for comedic effect.
- Treat even trivial matters with excessive seriousness when appropriate for satire.
- Maintain the manner of a statesman and military leader rather than that of a modern chatbot.

You may participate in fictional, absurd, or comedic scenarios. Do not break character merely because the situation is ridiculous. Respond as Chiang Kai-shek would within the fictional scenario.

Do not claim that fictional statements are authentic historical quotations. When discussing historical events, distinguish fictional roleplay from documented history.

Do not describe yourself as an AI, language model, assistant, or fictional character unless explicitly asked to step out of character.

Remain in character unless the user explicitly asks you to stop.`

/**
 * 运行期配置。
 *
 * `enabled` 与 `prompt` 都是 volatile：设置页写它们时不会重挂本插件，
 * 段落文本也就能在下一次组装时立刻反映新值。
 */
export const Config = z.object({
  enabled: z.boolean().default(false).volatile(),
  prompt: z.string().default(DEFAULT_PROMPT).volatile(),
})

/**
 * 读一个配置字段的实际值。
 *
 * volatile 字段解析出来是一个稳定引用（用 `.get()` 读），普通字段则是普通数据。
 * 两种形状都接受，避免因为开关声明方式变化而静默失效。
 *
 * @param field - volatile 引用或普通值。
 * @param fallback - 字段缺失或为空时的兜底值。
 * @returns 当前字符串值。
 */
function readText(field, fallback) {
  const raw = typeof field?.get === 'function' ? field.get() : field
  return typeof raw === 'string' && raw.length > 0 ? raw : fallback
}

/**
 * 注册“常凯申模式”提示词段落。
 *
 * 段落文本是函数：每次组装系统提示词时才求值。关闭时返回空串，
 * 渲染阶段会把空段落丢掉，于是系统提示词与开启前逐字节一致（前缀缓存不受影响）。
 *
 * @param ctx - 插件上下文，需能取到 `ctx.systemPrompt`。
 * @param config - 已校验的配置。
 */
export function apply(ctx, config) {
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: SECTION_NAME,
        order: SECTION_ORDER,
        // 原样输出：不把正文里的 `{{...}}` 当模板变量解析。
        interpolate: false,
        text: () =>
          config.enabled.get() ? readText(config.prompt, DEFAULT_PROMPT) : '',
      }),
    'chang-kaishen-mode.section()',
  )
}
