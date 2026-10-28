# 镜头衔接与机械运动

## 先处理物件与叙事连续性

同一物件跨镜头时，保持身份、位置、转角与运动方向；角度与相机轨迹用绝对时间t。下一拍的l归零，不代表物件应重新入场或角度归零。说明文字可以换，正在解释的物件仍可继续动作。

- 同对象的全貌与细节：沿同一相机轨迹推近/拉回，避免切点突然改变取景或尺寸。
- 新对象或新过程：用空间位置、运动方向、相同部件或声音建立联系；对象确实换装时先停机、分离、退出，再安装新部件。不要让正在啮合的齿轮直接长大。
- 跨时空/章节或对照：明确的硬切也可以成立；不把所有切点统一加溶解、模糊或whoosh。
- 配乐与环境声按段落连续铺设；动作声绑定实际事件，不因每拍开始重新敲击。字幕继续跟随原cues，不为了过渡移动口播。

## 可选运行接口

新项目加载 `vendor/transitions.js`。默认仍为原硬切；启用示例：

```json
{"scene_transition":{"type":"fade","duration":0.6},
 "beats":[
  {"id":"b0","scene":"wide","start":0,"end":6},
  {"id":"b1","scene":"detail","start":6,"end":12,"transition":{"type":"dissolve","duration":0.5}}
 ]}
```

这里仅展示新增字段，完整beat仍需句子绑定等。`beat.transition`优先于全片，false关闭该边界的继承配置。

| type | 行为 | 适用 |
|---|---|---|
| cut | 直接换景 | 有明确动机的章节或对照 |
| fade | 切点前半时长淡出当前说明，切点后半时长淡入新说明 | 主体持续、文字/标注更新 |
| dissolve | 切点后以旧拍最后有效帧溶解到正在运行的新拍 | 独立内容画面，允许短暂叠影时 |

时长0.1–2秒且不超过相邻任一拍长度；0.4–0.8秒可作起点，按节奏调整。fade不需要同时叠两套文字；dissolve会叠影，不宜用它掩盖同一机械部件的相位错误。dissolve旧拍停在end−1/fps，不要求场景支持负l或越界；不会挪动任何cues。

```js
window.FILM={
  shared(ctx,t,beat){
    // 同一实体与全片相机放在这里，用t而非每拍l维持状态。
    // 只画跨镜头共用的内容，不在后面的scenes中再画不透明底盖住它。
  },
  frame(ctx,t){ /* 稳定的chrome/注记 */ },
  scenes:{wide(ctx,t,l,beat){/* 本拍说明 */},detail(ctx,t,l,beat){/* 下一拍标注 */}}
};
```

shared只画一次，位于各拍内容层下面；随后scene按配置合成。字幕/chrome在内容转场之后画，不参与淡出。场景使用传入ctx，不写全局CTX；转场在隔离画布渲染后合成，局部函数重新设alpha也不会穿透外层淡入。缓冲按画幅重建且每次清空，保证乱序绘制一致。若同一物件需要跨场景继续运动，优先shared或明确共享模型，不能仅用两幅不同姿态做溶解。

`check.py auto`自动补采启用转场的切点前后与淡出/淡入中段；仍应看连续片段，不能只看两张完整状态。验收看主体是否跳位、画面是否亮度下陷、文字是否叠得难读、字幕是否被淡掉、音效是否在无动作时响起。

## 直齿轮示意助手

`vendor/gears.js`公开GearMotion：

```js
const a=GearMotion.geometry({teeth:18,module:10});
const b=GearMotion.geometry({teeth:36,module:10});
const theta=2*Math.PI*GearMotion.turns(t,[
 {start:0,end:10,turns:1.3}, {start:15,end:23,turns:2}
]);
const pose=GearMotion.mesh(a,b,theta); // angle、ratio、centerDistance
```

module是场景绘图单位，若用像素就不当成毫米尺寸。geometry支持18–200齿、15°–30°压力角，默认20°；输出采样渐开线齿面与简化齿根的points，需场景自行构建Path2D。默认可视侧隙是演示参数，不能作为加工标准或最小齿数设计建议。

mesh要求同模数、同压力角；参考圆中心距来自两个半径之和，相位用同一角度与齿数比推导，ratio带负号表示外啮合反向；可传lineAngle处理任意连心线方向。turns按互不重叠的绝对时间段计算累计圈数，可停转且不随切镜重置；smooth为零端点速度的缓动，linear为匀速。

它不求解载荷、弹性、碰撞、根切或真实安装过程。有关计算依据见[KHK标准齿轮尺寸](https://www.khkgears.co.jp/gear_technology/basic_guide/khk357_2/)与[KHK齿轮入门](https://khkgears.us/media/fqrlut1m/abcs-of-gearing-b.pdf)。测试覆盖齿数、速比、相位、连心线方向、停转连续性；浏览器对18/18与18/36的48个相位抽样检查齿面内部重叠，不宣称替代机械设计验证。
