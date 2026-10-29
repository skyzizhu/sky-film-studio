# 内容 × 表现风格 × 声音

已深化 `blueprint / museum / whiteboard / archive / product`，其余主题继续使用原接口。内容类型负责叙事与证据，风格负责视觉语法，声音档案负责动作发声；palette仍由theme选择。配置的默认建议不能证明镜头适合内容，最终仍需看动作、听声音并核对来源。

主题之外可配置独立讲解任务direction.task，逐拍证据和跨主题验证见 [narrative.md](narrative.md)。

## 选择与创建

```sh
python3 engine/new.py /absolute/new-film --content history --style blueprint --sound tactile
# 历史的来源与时间线 + 工程结构表达 + 轻触音效；可单独传 --theme 改色板。
```

`--theme blueprint|museum|whiteboard` 的新项目也会建立相应direction；已有影片没有direction时保持原行为。完整档案在 `themes/direction-profiles.json`，新片复制到 `engine/direction-profiles.json`，供本片Python引擎读取；它参与构建指纹。该文件是内容结构、动作/特效建议、配乐及语义音效默认值的单一来源。

| 内容类型 | 优先解释 | 复查要点 |
|---|---|---|
| concept | 关系与条件变化 | 图形能否说明关系，类比边界是否清楚 |
| history | 来源、环境、过程及影响 | 时间与史料、原物与工艺示意是否区分 |
| science | 现象、机制、条件与边界 | 因果可见，简化假设不被隐去 |
| news | 已知事实、证据与不确定性 | 来源日期，事实与推测是否分开 |
| finance | 数据口径、比较、解释与风险 | 基数、统计期，避免伪因果 |
| tutorial | 初态、操作、反馈与检验 | 操作确实改变状态，错误可恢复 |
| code | 输入、执行、状态与输出 | 路径可追踪，伪代码有标识 |

## 三套风格的针对性设计

| 维度 | 工程蓝图 | 博物陈列 | 白板推导 |
|---|---|---|---|
| 适合任务 | 拆解、传动、剖面、约束 | 实体辨认、材料、工艺细节 | 概念、步骤、比较、纠错 |
| 实体 | 轮廓与部件关系优先 | 形态依据与材质差异优先 | 简化造型，颜色承担分组 |
| 动作 | 沿约束轴运行，先因后果 | 整体后局部，动作中保持身份 | 按讲解顺序建立，保留前提 |
| 镜头 | 全结构到局部 | 稳定陈列与低速检视 | 保持推导的空间关系 |
| 配乐 | 稀疏FM、小调、低打击密度 | 柔和合成键音、五声、默认无鼓 | 轻尼龙弦、大调、默认无鼓 |
| 动作声 | 可选伺服、金属落位、路径气声 | 轻触与纸面；揭示默认静默 | 与绘线同窗的笔触、擦除声 |
| 特效 | 路径十字、角框、剖面导线 | 小标注、接触阴影、局部检视 | 笔尖、下划线、按需擦改 |

博物陈列不必绑定古筝，历史内容也可以用工程蓝图。三套档案都不自动在每个转场发声。`mechanical/tactile/marker/none`可以独立组合；角色声是合成示意，不是历史录音或实物采样。物体材质优先于风格：画的是陶土落位时可继续显式用clay，不应为了工程风换成金属撞击。

## 镜头意图与配乐

```json
{"direction":{"content":"history","style":"blueprint","sound":"tactile"},
 "beats":[{"id":"detail","intent":"inspect"}]}
```

这里只示意新增字段；正常beat仍须包含scene/start/end等。`intent`可选 `inspect/explain/resolve`。音层优先级：风格默认 → `music.layers` → `music.sections[intent]` → `beat.music.layers`；后者覆盖前者，嵌套默认深合并。分段配乐在小节边界采样，不是逐词切换。`bpm/music.mode/instrumentTheme`显式值保留；已有片应用新档案时不要只看style名字，就声称实际配器已变。

```sh
python3 engine/direction.py --project /absolute/existing --content history --style museum
# 仅写 checks/direction-plan.json，检查现有BPM/theme/music等覆盖项。
python3 engine/direction.py --project /absolute/existing --content history --style museum --apply
# 填入缺失默认；不替换已有色板、renderer、音乐，也不改事件/稿件/场景。
```

若确实要更换旧片风格，先独立复制项目，更新theme/renderer/配乐覆盖项，再按档案改写场景并重建；`--apply`不能自动把现有绘图代码变成另一种语法。

## 动作与音效共用事件

```json
{"events":{"annotate":[1.2,2.8],"land":[3.1,3.3]},
 "sfx_events":[
  {"event":"annotate","role":"draw","duration":"step"},
  {"event":"land","role":"contact","sound_profile":"tactile"}
 ]}
```

角色支持 `move/contact/reveal/draw/erase/transition`。显式kind优先；逐事件 `sound_profile` 优先于direction.sound；档案中为null的角色保持静默。`none`关闭默认角色声，显式kind仍按作者意图播放。不会因为选了主题就自动生成事件。动作时长超过单个音效支持的5秒时按实际动作分段，不硬截。

```js
const points=[{x:100,y:220},{x:320,y:220},{x:320,y:400}];
const r=StyleMotion.trace(ctx,l,beat.events.annotate,points,
  {style:FILM_META.direction.style,color:TH.palette.accent,seed:17});
// r.tip与已绘制线段来自同一路径；笔尖不是另算一条近似轨迹。
StyleMotion.focus(ctx,l,beat.events.inspect,
  {x:210,y:300,width:240,height:150},
  {style:FILM_META.direction.style,color:TH.palette.accent});
```

trace按路径弧长推进，蓝图用十字、陈列用小端点、白板用笔尖及固定种子轻微偏移；结束后保留完整线条。focus在事件窗内显示角框、陈列标注或下划线；没有全帧后处理。都在内容坐标中绘制并恢复context状态。实际擦除须由场景改变可见内容，只有声音不会自动擦除画面。

## 对照与验收

每套风格先做适合其任务的镜头，再用相同内容作对照。检查声音是否有可见来源、静默是否合适、材质是否误导、因果是否可见、字幕是否被盖住；不要只评价“很像某种风格”。`checks/arrangement.json`记录实际合成音色、分段音层和音效时间/类型/时长，配合分镜问题与视觉证据复核。自动检查证明配置与技术行为，不能代替内容契合度和真人试听。

本轮测试：`test_direction.py`验证组合/覆盖/旧片兼容/同源时间及音色；`direction_runtime.py`验证实际浏览器轨迹、端点、三风格差异、状态恢复、时间乱序，以及实际音频输出与重复一致性。

## 风格乐句与音层衔接

三套档案含独立 `music.motif`，每项是一小节的 `[beat,noteIndex,durationBeats]` 列表，beat 在0–4之间（不含4），noteIndex为和弦音级索引0–7，时值以拍计；空列表表示主奏休止小节。支持1–8小节循环、每小节最多16音，按拍位排序。第一小节保留铺垫，随后按乐句循环。显式motif优先于leadDensity；没有motif的旧片保留原旋律生成方式。

`music.layerRamp` 以秒指定小节音层切换渐变，范围0至min(2,小节秒数)；三套档案默认0.6，未配置的旧片仍为0。渐变作用于跨小节音符的尾音和新音符，不把已经发声的尾音突然截断。音色、节拍和静默小节共同区分风格，但不代表每个内容必须使用默认乐句；实际试听后按内容覆盖。编曲日志记录motif、layer_ramp_seconds及每小节实际生成的lead_count。

## 历史叙事与环境声

archive 档案与 history 内容独立组合；暖色档案底、来源注记、空间/物件线索与条件失败的使用方式见 [history.md](history.md)。historical 声音档案提供 wood_turn / wood_stop；这些是木制动作的合成示意，不是史物采样。显式动作声仍可按材料覆盖。

```json
{"soundscape":[{"id":"open-air","kind":"wind","start":0,"end":45,
 "gain":0.07,"fade_in":1.8,"fade_out":3,"seed":1794}]}
```

环境声采用全片绝对时间，不随beat重启。当前仅支持wind；id唯一，区间在影片内，gain为0至0.3，渐入/渐出分别为0.02秒至环境声时长，seed为0至2^32减1的整数。重叠淡入淡出相乘，可用于短环境声。独立种子不消耗配乐随机流。环境声与动作声一起写入sfx.wav，并应用现有口播闪避与片尾淡出；没有额外独立环境音轨。编曲日志的soundscape记录实际区间和合成来源。没有soundscape的旧片不添加环境声。

## 动作声的画面位置

语义音效事件支持pan（-1左至1右，默认0）与显式gain。持续动作仍由同一事件窗驱动；可按镜头近景/远景调整增益和左右位置，不能只按主题机械地左右摇摆。底层兼容sfx数组的第五项pan；需要默认时长时第四项可为null。编曲日志记录实际pan。它只是立体声位置和音量示意，不是物理声场或历史录音复原。

## 产品展示与观察留白

product 风格、promotion 任务和产品证据要求见 [product.md](product.md)。默认采用动态发布节奏，可选 precision / flow / playful；studio 保留 product_clean 安静陈列。具体接口与默认值见 product.md；不绑定品牌色，也不自动在切点加音效。

逐拍可添加 BGM 关注区间：

```json
{"events":{"result":[3,4.5]},
 "music":{"focus_events":[{"event":"result","duck_db":-5,"attack":0.3,"hold":0.25,"release":0.8}]}}
```

事件使用本拍局部时间。duck_db 为 -24 至 0；attack/release 为 0.02–3 秒，hold 为 0–3 秒。事件起点到终点加 hold 期间衰减，前后平滑降低/恢复 BGM；片外部分不输出。重叠取最深衰减，不叠乘；不修改人声与 SFX，和口播闪避独立相乘。未配置时保留旧混音。编曲日志 music_focus 记录实际绝对时间，无需为了留白移动口播或添加提示音。
