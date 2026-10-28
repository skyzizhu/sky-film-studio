# 材质、光影与局部效果

`new.py` 自动快照并加载 `vendor/materials.js`，公开 `MaterialFX`。这些是 Canvas 2.5D 绘制辅助，不是 PBR 或真实照明求解；实体轮廓、关键部件、动作与事实准确性仍由场景负责。

## 表面与接触阴影

```js
const face = new Path2D();
face.roundRect(-60, -60, 120, 120, 4);
const box = {x:-60, y:-60, width:120, height:120};
MaterialFX.surface(ctx, face, box, {
  material:'clay', seed:31, light:{x:-.7,y:-1}
});
```

`surface` 在 path 内裁切；box 与 path、光照方向均使用调用处的局部坐标。实体旋转时，局部光照会随实体一起旋转；若需固定世界光源，应先将方向向量转换到实体局部坐标。绘制后恢复 canvas 状态，并保留上层 globalAlpha。默认 `clay/paper/metal/wood` 分别为哑光颗粒、纤维、窄高光和纵向纹理；`base/dark/lightColor/roughness/grain` 可覆盖，`grain` 为0–300个纹理标记。roughness 控制示意高光强度；用同一实体 seed 保持纹理稳定，不要以帧号作为 seed。

```js
// 先在地面坐标画阴影，再在 y-elevation 处画实体。
MaterialFX.shadow(ctx, {
  x:groundX-65, y:groundY+45, width:130, height:38,
  elevation:lift, opacity:.28
});
```

`shadow` 的 x/y 是地面投影包围框左上角；随 elevation 扩散、偏移并减淡。它不是物体自身侧面暗部；不要对同一实体再叠加一份强 canvas shadow。box须为有限值且宽高大于0。

## 内容特效（默认不调用）

```js
MaterialFX.sweep(ctx, localTime, face, box,
  {start:detailStart,end:detailEnd,opacity:.12});
MaterialFX.guide(ctx, {x:100,y:200}, {x:100,y:380},
  {color:TH.palette.accent,opacity:.35});
```

扫光只在指定区间内出现，并裁切到实体表面；可用于检视或金属材质揭示。导线用于剖面/拆解图解释对齐关系。时段接入 beat.events，不另写一条无关循环；动作音效继续用同源 sfx_events。不要给陶土默认增加镜面高光，或让扫光、导线覆盖字幕/chrome。需要固定屏幕方向的纹理或复杂遮挡时，按该镜头定制，不强行套用本助手。

运行 `python3 tests/materials_runtime.py` 检查实际项目装载、四种材质、裁切/状态恢复、随机种子、方向反转、抬升阴影、效果时间窗及横竖屏背景复用。最终仍需关键帧及连续片段视觉检查。
