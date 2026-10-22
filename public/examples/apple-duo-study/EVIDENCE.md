# 源码证据：iPhone Duo 产品查看器

参考：https://www.apple.com.cn/iphone-duo/ ，读取日期：2026-10-22。
目标：复原「定睛细看」卡片中七个入口、姿态切换、折叠滑块、自由旋转。

| 问题 | 证据与结论 | 状态 |
| --- | --- | --- |
| 是图片还是模型？ | DOM 为 canvas；ProductViewerWebGLSingleton 使用 Lotus.loadScene；场景引用 glTF、EXR、AVIF。 | confirmed |
| 是否 Three.js？ | Lotus bundle 包含 Three.js WebGLRenderer、GLTFLoader、AnimationMixer 等实现。上层是 Lotus 场景系统。 | confirmed |
| 场景选择 | 非触摸设备 L；触摸设备 outerWidth ≤884 选 S，否则 M；支持 ASTC 时 _ktx，否则 _avif。 | confirmed |
| 左侧入口 | HTML 的 data-viewer-state 对应 PT_SliderLanding、PT_Landscape、PT_Portrait、PT_Closed、PT_Laptop、PT_Tent、PT_Durability。 | confirmed |
| 切换机制 | weights_main 的 VariantWeightsMixer 在自由相机和预设镜头之间混合；weights_pt 的 VariantWeights 驱动预设。 | confirmed |
| 折叠驱动 | Hinge → 磁吸弹簧模拟器 → AnimationScrubber → glTF 的 Slider 动画。 | confirmed |
| 滑块与镜头 | 三个权重节点 Closed=0、Landing=1/3、Open=1；以 stretchPosition 与 position 差值经 tanh 衰减修正。 | confirmed |
| 磁吸和弹簧 | 场景 Hinge：闭合强度30、展开强度20、半径均0.08；duration=0.75、bounce=0.15。 | confirmed |
| 相机混合 | weights_main stiffness=12、damping=0.9；相机角度、材质、屏幕变化来自引用的 LSD 变体数据。 | confirmed |
| 模型依赖完整性 | 递归读取真实场景、@path、@variants、@animations、glTF uri；327 个本地文件均由 manifest 映射。 | confirmed |
| 卡片尺寸动画 | 原模块 `jyvMZwYblx5TfrkyNHnN` 对旧、新 `li` 的 width/height 同步插值，使用 `spring(1,100,14,0)`、1 秒；起终点为缓存的 button/content 尺寸，并非每次从当前几何接续。 | confirmed，并用原 SpringEasing、共享时钟实施 |
| 内容分层 | 展开按钮 50ms 淡出；内容 opacity 600ms/250ms delay，Y 28→0 为 400ms。收起按钮 400ms/350ms delay；内容 opacity 300ms，Y 为 400ms。 | confirmed，并按 CSS 原值实施 |
| 控件入场 | 先弹入的是与按钮分离、没有图标和文字的 56px `.intro-element`，参数为 x=-100→0、scale=0→1、`spring(1.61,100,14,0)`；600ms 后真实按钮背景开始展开，中央标签再延迟 250ms 淡入。上下两组从中央向外错峰，背景 width 56→实宽并带 y/scale 弹簧。 | confirmed，并按原分层与时序实施 |
| 自由旋转入口 | 原桌面控件在 viewer pointerdown 时关闭卡片、index=-1；场景将 `ptActivation.targetValue` 设为 0，释放自由相机。 | confirmed，并实施 |
| 拖动/松手 | 原 InteractiveCamera：drag lerp=.2、snap lerp=.095、throw=[.25,.25]；最近预设角由指针速度预测，松手继续插值吸附。 | confirmed，直接复用原 Lotus 控制器 |
| intro / hint | 场景 timeline 引用 `dozzbERHAxeMXzM.lsd`；本场景的可见轨道为 rotationY 0→0，仅作生命周期触发，用户交互后暂停并清除 hint timer。 | confirmed |
| 浏览器验证 | 点击 viewer 后 activation 1→0.078→0；一次真实拖拽 theta 3.1416→2.1172，松手吸附到 1.5604。 | confirmed |
| 完全相同的外观 | 原模型/材质/灯光/姿态与桌面交互保留；独立页面外壳及 734px 以下移动端卡片系统仍是学习页适配。 | desktop close；mobile approximate |

## 定位

- 主脚本 `/v/iphone-duo/d/built/scripts/overview/main.built.js`
- 渲染库 `/v/iphone-duo/d/built/scripts/vendors~lotus-lib.built.js`
- CSS `/v/iphone-duo/d/built/styles/overview.built.css`
- 场景 `/v/iphone-duo/d/static/scenes/iPhoneDuo_ROW_L_avif.lsd`
- 主 bundle 模块：`pz0qtX7E9h5JJTfW5E1X`（CustomProductScene）、`G/823tc85dsSMqfo54Kg`（基础查看器场景）、`a6KkYNc7ItI2tZbDpVEF`（Hinge）、`ju1MucNkkwbyrNP8rxxT`（磁吸模拟器）。

原文件保留；运行时使用副本并移除原站入口初始化，只开放模块加载器，避免把原站整页系统带进来。可读代码负责 UI 和场景适配，渲染与物理保留原实现用于学习。

## 2026-10-22：卡片联动、初始化及箭头修正

### 滑钮阻尼与拉伸（源码核实）

- **confirmed：独立输入与显示。** 实际 DOM 的透明 range 只负责键盘/辅助功能；可见滑钮是 output 内的独立 thumb。`KxKds5ZMALHNqLHQsvsB.onDetentSimulationUpdate` 消费场景 Hinge 的同一个 `simulationUpdate`，不能直接把鼠标坐标写到可见滑钮。
- **confirmed：变形公式。** 有效行程 `W = track.width - 60`；`d = tanh(abs(stretchPosition-position)/(stretchMax*2)) * stretchMax * W`。thumb 平移 `position*W`，纵向比例 `1-.0025*d`，宽度 `60+d`；按差值方向决定固定左端还是右端，图标横移 `sign*d*.5`。
- **confirmed：输入。** thumb 使用 pointerdown/move/up，拖动范围以两端各半个 thumb 宽度计算；track click 传 `isClick:true`；释放传 `pointer:false`，由原磁吸模拟器持续收敛。键盘左右按 0.5 步进。弹簧沿用 Hinge 场景参数，不另叠 CSS transition。
- **修前缺失：** 学习页用原生 range thumb 直接跟随目标值，且拖动时不回写模拟位置；既绕过了位置阻尼，也完全缺少方向拉伸/恢复。
- **实施与实测：** 学习页改为透明 range + 独立 output/thumb；指针只写目标 `sliderProgress`，可见滑钮、range 当前值和模型都消费 Hinge 的 `simulationUpdate`。本地快速拖至右端时，thumb 从 `translateX(102.355px)` 逐帧追到 `307px`，端点处宽度 `60→62.99→61.76→60.04px`、`scaleY 1→.9925→.9956→.9999`，随后出现一次反向微过冲再归零。点击远处轨道时变形峰值约 `92.28px/.9193`，之后持续衰减；键盘路径同样经模拟器收敛。对照原站同路径确认平移滞后、固定端方向、压缩、回声和恢复顺序一致；本地控制台无 error/warn。

- **confirmed：桌面负过冲不能裁掉。** 原 CSS `.control-item` 的桌面规则没有 `min-height`/`min-width`，移动端才另设最小值。本地曾全局设置 `min-height:56px`，导致旧卡片收起负过冲被截平，而新卡片的正过冲仍存在。两者之和不再互相抵消，整列垂直居中会在回弹阶段额外移动；这不是阻尼参数不同。
- **修前采样：闭合 → 站立。** 原站旧卡高度约 53.73px、新卡约 108.26px，合计约 162px；本地旧卡被钳在 56px、新卡约 134.40px，顶部按钮比稳定位置上移约 1.71px。采样读取实际 DOM 几何，工具点击返回已经经过一段动画，表中采样时刻不能当作点击零点。两页展开正文高度仍受字体影响不同。
- **实施：** 735px 以上取消尺寸下限；旧卡收起与新卡展开共用同一开始时间。保留 flex 布局自然推挤和整列居中，不给每个旁侧按钮另加延迟或弹簧。resize 会取消旧尺寸 RAF 再按缓存设置目标，避免旧动画回写过期尺寸。
- **修后验证：** 同一路径采样中旧卡最低约 52.56px、新卡最高约 134.40px；二者合计几乎恒定，采样段顶部按钮 y 最大差约 0.0052px（修前相对稳定位置最大偏移约 1.71px）。这是恢复互补几何后的实际结果，并非调小弹簧过冲。JavaScript 语法检查通过，本地浏览器无 error/warn。
- **confirmed：内容遮罩层不做位移。** 原 `.control-item-content-inner` 承担 opacity、visibility 和 y=28→0；mask 固定并裁切。对应本地 `.detail-inner`，避免整个裁切区域随内容移动。
- **confirmed：上下箭头。** 原 SVG path、36px 圆形 icon、44px 点击区；默认隐藏；首次展开 scale 用 300ms、y=120→0 用 600ms，均为 easeOutQuart。关闭后重新隐藏，并按首尾项设置 disabled。
- **初始化：** 卡片先全部收起，场景加载后明确进入 index=-1 再开始 intro。HTML 初始即带 `intro-pending`，按钮、背景及含图标的标签层在首帧隐藏；JS 设置完全部初态后才显示 controls。独立无文字圆形先弹入，600ms 时真实背景接替，中央「闭合」标签在约 850ms 才开始由 opacity 0→1。逐帧采样确认 0–786ms 始终为 0、约 913ms 为 0.153、1166ms 为 1，没有出现→消失→再出现。仍以本地 2200ms timer 自动展开第一项；原站等待 scene intro 和 AAP intro 两个事件，这一生命周期尚非完全等价。
- **排版限制：** 当前本地闭合/站立内容约 130.97px，原站为 106px；font stack/字形换行与字体资源尚未完全对齐。因此不同高度卡片之间的真实布局位移量仍可能不同；不得通过改阻尼掩盖这项排版差异。734px 以下保持独立学习页适配。
