# 实体选择、部件与动作

## 表现方式与验收

先问：本镜头要认出什么、理解什么变化、什么关系不能画错？记录主体的视角、关键特征、参考依据、局部 bounds、anchor 和退出方式。简单镜头写入 beat.note 即可，不必新增文件。

| 目的 | 选择 | 验收 |
|---|---|---|
| 概念提示 | 图标/简单几何 | 缩小仍清晰，符号语义一致 |
| 器物/建筑 | 参数化实体/SVG/参考图 | 轮廓与关键结构正确 |
| 历史遗物/人物/指定产品 | 可核查参考素材或标注示意 | 不虚构细节冒充事实 |
| 原理/因果/流转 | 部件动作/剖面/连线/状态对照 | 看得到原因、过程、结果 |
| 空间关系/视角变化 | 2.5D 或必要的 3D | 深度和遮挡帮助理解 |

现场组合不是所有物体的默认路径。合适的现有图标也能表示具体对象；不要为了“手绘”牺牲辨识度。外部图片/字体/代码记录在 provenance.json 的 assets（路径、来源、许可/用户提供说明）。

## 旧路径接口

```js
const paths = [_poly([[-40,20],[0,-30],[40,20]],true)];
drawEntity(ctx,t,l,{paths,x:W/2,y:H*.4,s:3,at:.2,dur:.8,motion:'drawOn'});
```

`OBJECTS[id]` 和图标路径继续可用。`_poly(points,true|false)` 显式闭合；圆默认闭合；旧数组只对首尾近乎重合的情况自动闭合，不再用大容差补边。路径注册后视为不可变；修改几何时创建新数组，弧长缓存才可靠。`omit:true` 才是主动省略，未知 id/motion 报错。

## 部件模型（可选，不强制重写旧实体）

在 `window.ENTITIES` 注册，或传 `cfg.entity`：

```js
ENTITIES.box = {
  bounds:{x:-50,y:-50,width:100,height:100},
  anchor:{x:0,y:50},
  palette:{body:'accentDeep',edge:'accentHi'},
  parts:[
    {id:'body',points:[[-40,-40],[40,-40],[40,40],[-40,40]],
     closed:true,fill:'body',stroke:'edge',z:0},
    {id:'lid',points:[[-45,0],[45,0]],closed:false,fill:null,stroke:'edge',
     x:0,y:-40,anchor:{x:-45,y:0},z:1,
     pose:(t,l)=>({rot:-Math.min(1,Math.max(0,l-1))*.6})}
  ]
};
drawEntity(ctx,t,l,{id:'box',x:W/2,y:H*.4,s:3,at:.2,
  enter:'fadeIn',action:(t,l)=>({x:Math.max(0,l-2)*20}),exitAt:5,exitDur:.3});
```

- part 支持 points 或 paths；closed 显式控制。fill:null 为纯线，stroke/颜色 token 由 palette 或主题解析；z 决定遮挡。
- 多子路径需要孔洞时用 `fillRule:'evenodd'`，与 fill 配合；多面分色应拆成部件。`flat` 是装饰分面，不是结构/材质准确性保证。
- part.pose(t,l) 返回 x/y/rot/sx/sy，围绕 part.anchor 变换。cfg.action(t,l) 控制整体平移/旋转（部件模型还支持 sx/sy）；所有函数必须纯由时间决定。
- enter 与 motion 兼容；part.enter 可覆盖整体入场，delay 为相对 cfg.at 的延迟。exitAt 为镜头局部时间。
- `ENTITIES.wheeledCart` 是部件/轮转的可运行示例。可复用同一 id 在多个镜头表现身份连续性。

## 动作与时机

`drawOn`=描绘，`grow`=围绕底端锚点展开，`floatIn`=漂入，`flyIn`=曲线飞入，`fadeIn`=淡入，`brushReveal`=笔刷遮罩。它们是入场，不代替抓取、打开、传递、转动等行动。`grow` 可设 anchor 或 base；sway 显式开启。flyIn 的 trail/orient 默认关闭，按需要开启，headingOffset 校正物体本地朝向。

`at`、exitAt、part.delay 使用场景局部时间；绝对事件点需减 beat.start。名词触发优先使用词级对齐或试听事件点。句级 cues 下只承诺句级配合，不凭字符比例声称一帧准确。

## 验收

先看目标画幅和缩小预览：轮廓可认、关键部件齐全、结构关系可信、颜色一致。再看入场初期/中段/完成态与退出前后，以及连续短片段：无跳变、重复影像、错误旋转、穿帮遮挡或锚点漂移。按叙事需要设计动静，不以动画数量作为质量指标。

外部图片/纹理先加载解码，并将加载 Promise 暴露为 window.__assetsReady；scaffold 会在 ready 前等待，加载失败应 reject。不能在 draw(t) 内发网络请求。
