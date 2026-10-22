---
name: source-first-web-motion-repro-v2
description: 从当前参考网页实际加载的 HTML、CSS 和压缩 JavaScript 中追踪状态、布局与动画参数，按源码证据复原交互。适用于网站动效复原、压缩代码研究、目录展开、拖动阻尼和复杂输入反馈；不要用截图、旧案例或通用经验替代当前源码分析。
metadata:
  short-description: Rebuild web motion from source evidence
---

# Source-First Web Motion Reproduction

Version 2.0. This revision adds a source-backed motion-system audit for interactions where input targets, simulated state, and visible presentation are not the same value.

Use this skill when a user wants to study or recreate a web interaction from a reference URL and permits source inspection. The result is an explained, testable implementation based on observed source behavior, not a visual approximation.

## Non-Negotiable Rule

When the reference's loaded code is accessible, do not invent behavior from screenshots, a short visual inspection, or a generic animation pattern. First inspect the actual page and loaded source. A screenshot can validate framing and appearance, but cannot establish state transitions, timing, layout rules, or input handling.

Only inspect material that is public or that the user is authorized to inspect. Do not bypass authentication, paywalls, access controls, anti-bot measures, or license restrictions. Do not copy the reference's proprietary text, artwork, data, fonts, or branding into the reproduction unless the user provides permission and assets.

## Workflow

1. Establish the target behavior in one sentence: identify the trigger, states, and visible result. Keep it bounded, for example: "Clicking a category expands its cards from the category node; clicking it again collapses them."
2. Inspect the live DOM before writing code. Record element IDs/classes, ARIA state, URL changes, viewport-dependent branches, and the exact interaction sequence.
3. Save or inspect the page's *loaded* CSS and JavaScript bundles. Prefer browser network information or an approved download of publicly served static assets. Do not rely on a page's prettified source alone when it loads code-split chunks.
4. Locate the relevant implementation in the bundle. Search distinctive DOM IDs, class names, visible labels, route parameters, event names, and animation-library calls. Trace outward until the state model, layout function, and renderer are understood.
5. Trace the complete update chain from the current reference source, not from a remembered pattern or a previous project: input/gesture target → state or simulator → per-frame output → DOM/canvas/model presentation → accessibility output. Identify values that intentionally lag or differ (for example target position versus simulated position); do not bind presentation directly to the target if the source does not.
6. Extract an evidence ledger before implementing: state/path shape, trigger semantics, timing/easing or spring constants, layout formula, responsive branch, input lifecycle, and which layer owns each visual property. Mark every item as `confirmed`, `inferred`, or `unknown`.
7. Implement the smallest behaviorally complete slice. Preserve the source mechanism where it matters: a world-coordinate scene when the source uses one, calculated layout when the source uses one, dynamic path recomputation when paths follow moving cards, and one authoritative simulation when multiple visual outputs depend on it. Do not replace it with static coordinates or a second CSS spring merely because the first screenshot looks similar.
8. Test actual transitions in a browser. Cover a clean initial load, input start/move/release/cancel, settling and any overshoot/echo, both motion directions, meaningful endpoints, click/tap and keyboard paths, rapid switching, resize breakpoint, and drag/scroll conflict as relevant. Sample intermediate frames, not only before/after states. Check console errors, URL/ARIA state, and final settled geometry.
9. Compare reference and reproduction with the same viewport, input path, and sampling points. Use source tracing to explain differences; screenshots validate appearance but do not establish the mechanism. Separate parameter mismatch from layout/font/asset mismatch.
10. Report honestly. Separate confirmed correspondence from deliberate approximation, name the tested viewport/input paths, and list unavailable source assets or unverified behaviors.

## What To Read

- Read [the evidence workflow](references/evidence-workflow.md) before inspecting an unfamiliar site.
- Read [motion and layout mapping](references/motion-layout-mapping.md) when the target contains node graphs, expanding clusters, animated connectors, or spring interactions.
- Read [本次实战案例](references/catalog-case-study.md) for concrete source parameters, past mistakes, and their corrections. These values belong to that reference version; do not impose them on a different website.
- Read [motion-system-audit](references/motion-system-audit.md) when the interaction has input/simulator/presentation layers, springs, drag inertia, echoes, or staged initialization. It defines source-verification questions and sampling methods; it contains no project-specific parameters.
- Use [extract-slices.mjs](scripts/extract-slices.mjs) to inspect a single-line compressed bundle. It reports a SHA-256 hash, candidate function declarations, marker matches, or ranges. Offsets are JavaScript UTF-16 string indices, not byte offsets. It does not alter source files. It requires Node.js and has no third-party dependencies.

从技能目录运行，例如：

```sh
node scripts/extract-slices.mjs /path/to/bundle.js --info
node scripts/extract-slices.mjs /path/to/bundle.js node-anchor --context=1200 --limit=8
node scripts/extract-slices.mjs /path/to/bundle.js --functions --limit=100
node scripts/extract-slices.mjs /path/to/bundle.js 15937:19645
```

字符串搜索和函数列表只是定位入口，不是 AST 解析结果。函数列表不覆盖箭头函数；需要时使用环境已有的格式化器、解析器或 source map。没有 source map 也继续分析当前压缩代码。命令行退出码 0 表示成功，1 表示参数/读取错误，2 表示至少一个搜索词未匹配。不要一次倾倒整个 bundle；逐段读取调用链。

## 与用户沟通

用用户的语言沟通。开始时明确说“先读取实际加载代码，再复原交互”。进度更新说明刚确认的源码事实与下一步，不要反复承诺学习、长篇自辩或声称读了没有读过的代码。通常不需要把压缩代码整段贴给用户；用证据笔记保留函数定位和参数即可。

用户只要求分析时，交付分析；用户要求实现时，继续完成实现与验证。用户明确只要动效、不要动态素材时，使用静态占位内容，不引入视频或远程媒体依赖。不要把本技能当成自动授权修改 PRD、发布网站或安装依赖的理由。

## 源码获取与中断条件

优先使用当前环境允许的浏览器网络能力、连接器或下载工具。如果浏览器脚本接口只支持只读 DOM，就不要尝试用它执行点击、网络请求、写入页面或改变视口。使用支持的交互接口进行点击。工具访问被拒绝时，停止该操作；不要更换工具绕过拒绝。

源码未能获取时，先用允许的其他读取渠道排查；仍无法获取就说明具体缺失。只有用户接受视觉近似时才采用观察推断，且明确标注它不是源码复原。压缩并不意味着源码不可读，也不是跳过分析的理由。

## Implementation Standard

Build a behavior model before visual polish. The implementation should preserve these relationships whenever the source confirms them:

- **Source outranks analogy.** A prior reconstruction, a familiar library, a screenshot, or a plausible animation pattern is only a search hint. It cannot establish a rule for the current target. Every reusable rule must be phrased as a question to answer in the current DOM/bundle and marked `confirmed`, `inferred`, or `unknown`.

- State is explicit. A category click selects a target path; re-clicking the current target returns to the parent path when that is what the source does.
- Layout is data-driven. Treat card coordinates, ordering, collision rules, and camera placement as output of a function, rather than hand-positioning a screenshot.
- Motion uses a common progress or physics model. A moving card and its connector must read the same animated position in the same frame.
- Input is intentional. Respect source drag thresholds, click suppression after a drag, wheel behavior, keyboard escape/back behavior, and responsive mode switches.
- Accessibility state follows behavior. Update `aria-expanded`, `aria-current`, live status, and focus behavior based on the same source state model.

- When the source exposes separate target, actual, or presentation values, preserve the separation and identify the authoritative update event. If multiple outputs consume one simulation event, use one source of truth rather than independent transitions.

## Do Not Do This

- Do not call a reconstruction faithful after only viewing a screenshot or recording.
- Do not begin with a generic modal/card transition if the target behavior is an expanding graph or catalog.
- Do not wait for outgoing cards to finish before rendering incoming cards when the reference crossfades or overlaps them.
- Do not measure positions from transformed screen DOM and then apply the same camera transform again. Use one coordinate system for nodes, cards, links, and camera.
- Do not silently substitute placeholder behavior for a source behavior. State the approximation and why it exists.
- Do not claim "tested" from syntax checks alone. If desktop interaction could not be exercised, state that limitation explicitly.

## Deliverables

For a substantial reproduction, include a small readable note in the project containing the evidence ledger and source-to-implementation mapping. It must identify the reference URL, retrieval date, bundle/CSS filenames or URLs, tested viewport, and the parts that remain approximations. Do not include copied proprietary bundle code in that note.
