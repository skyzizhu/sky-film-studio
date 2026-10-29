# 分配推导与安全构图

先确定“什么不变、什么改变”。等分演示中，总数与单个物件的身份不变，位置与分组改变；修改一个条件时，明确回到哪一组原始数据，并区分新加入的物件。颜色可表示来源，位置可表示目标组，不能未说明就改变颜色含义。示例数值必须从 data.js 计算总和、均值和绘图数量，不并行维护两套硬编码数字。

## 物件守恒

新项目已装载 vendor/teaching.js：

```js
const pieces=TeachingMotion.equalSlots(TeachingMotion.tokens(DATA.example.values),3);
const positions=TeachingMotion.interpolate(pieces,t,{
  start:6,end:9,
  from:q=>sourcePosition(q.group,q.slot),
  to:q=>targetPosition(q.targetGroup,q.targetSlot),
  lift:80,stagger:.2
});
positions.forEach(q=>drawToken(ctx,q));
```

`tokens` 为每个物件建立稳定 id；每组数量为 0–100 的整数，最多20组。`equalSlots` 要求物件数能整除份数；余数、分数或可连续分割的物料需要另建教学模型，不能偷偷丢弃物件。`interpolate` 仅返回位置与进度，不画图、不自动加音效；from/to 必须是纯函数，start/end 为同一时钟上的区间，stagger 为 0–0.8 的区间比例。先聚拢再分配时，两段必须共享同一中间布局；改变数据时给新增物件新的 id。

运动期间区分当前状态与目标结果；不要把尚未分好的组标成“已分好六块”。落位后留出读图时间。重复/乱序时间采样、初末数量和身份集合均需验证。

## 横竖屏安全区

```js
const r=FilmLayout.regions(W,H,{subtitleLines:2});
// r.title / r.stage / r.compare 为 x,y,width,height；compare 竖屏上下、横屏左右。
```

这是布局起点，预留默认顶栏与底部字幕。它不测量实际文字、不追踪自定义 subtitleY、进度轨或平台按钮，也不会自动重排场景；有这些覆盖项时重新核算。内容仍应依据真实 W/H 设计，避免把横屏画面整体缩成竖屏中间的一小块。特写可局部裁切，但要把内容限制在字幕保留区之外。至少查看标题最长、物件数量最多、转场中点与片尾的画面。

## 博物陈列补充

整器、工艺、对照和特写可以采用不同构图，但轮廓参数、刻记和接触点必须来自同一模型。手或工具的接触点从实际轮廓采样，不能另写近似坐标。成品回到原料时写明回溯；干燥/烧制压缩时间时明确标注。质感与色泽变化是示意，不能暗示所有泥料有同样颜色、温度、收缩或烧制程序。虚构器物不可冒充历史实物。对照图中两幅应标识为同一对象的不同状态，避免误以为出现两件原物。
