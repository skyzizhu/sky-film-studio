# 语音：火山双通道、四路来源、cues 同步

## cues.json —— 同步的唯一机制

`voice.py` 的所有路径最终都产出同一份 `audio/cues.json`：

```json
{ "sample_rate": 48000, "total": 58.8,
  "sentences": [ { "idx":0, "text":"……", "file":"audio/sent_000.wav", "start":0.0, "end":3.42, "role":"narrator" } ] }
```

- **字幕**：scaffold 按 sentence 的 start/end 逐句显示（淡入 0.15s/淡出 0.25s），窗口直接取 cues，禁止手拍。
- **分镜**：`voice.py plan` 把句子分组量化到小节线，beat 边界即 sentence 边界的包络。
- **混音**：audio.py 按 cues 对 BGM 做 duck（口播起止 ±0.15s 斜坡，默认压 8dB）。

## 音画同步机制（最重要）

**小节网格是唯一主时钟。** 音频若按"自然时长+间隙"排、画面按"向上取整整小节"排，两套时钟的差会**逐拍累积**（敦煌片实测片尾口播比画面早 11.6 秒）。规则：

1. `plan` 在量化 beats 后**自动重写 cues.json**：每句起点 = 所在拍起点 + lead（默认 0.35s，画面入场动画 0.1–0.3s 略先于声音）。
2. **手改 film.json 的 beats 后必须重跑 `voice.py place --project <film>`**（同样的落位逻辑），再 `audio.py build` 重混音——画面帧不用重渲。
3. 字幕与 duck 读同一份 cues，自动跟随。验证：每句 |拍起点+lead − 句起点| = 0，句末 ≤ 拍末。

## 四路来源

| 路 | 命令 | 说明 |
|---|---|---|
| 火山平台音色 | `voice.py say`（speaker 非 `S_` 前缀） | `seed-tts-2.0`，如 `zh_male_liufei_uranus_bigtts` |
| 火山复刻 | `voice.py say`（speaker `S_` 前缀） | `seed-icl-2.0`，复刻槽位 |
| macOS 系统声 | `voice.py say --mode system` | 中文音色自动挑（Tingting 优先），免费离线 |
| 用户录音 | `voice.py import --audio x.wav [--text 稿]` | 能量 VAD 切句；给文稿则按字数比例对齐文本 |

多角色：narration.txt 行前缀 `[角色名]`，film.json `roles` 可按角色绑音色（v1 统一单音色，多角色排期 v2）。`say --reuse` 复用已合成的句子，改稿只重合成改动句。

## 配置与授权（复用用户已有配置）

解析顺序：`--config` > `~/.config/sky-film-studio/media.json` > **兼容读取** `~/.config/huashu/media.json`（只读，尊重其 policy/bindings）。

```json
{ "preferences": { "voice": { "mode": "clone", "voice_ref": "liufei" } },
  "policy": { "cloud": "allow", "paid_api": "allow" },
  "bindings": { "volcengine": { "env_file": "~/.volc.env" },
                "voices": { "liufei": { "entry": "liufei" } } } }
```

- 凭证：环境变量 `VOLC_SPEECH_APPID` / `VOLC_SPEECH_TOKEN`，或 env_file（支持 `export K=V` 行）。配置只存文件引用，不存 Key。
- 音色解析链：bindings.voices[ref].speaker_id > 注册表 `~/.koubo/voices.json` 的 entry > 字面 speaker_id（`S_`/`zh_` 前缀）> 报错指引。
- policy 非 allow 且无本次明确授权 → 不调云：回退系统声或转 C 模式，并告知用户缺口。**凭证永远不进聊天、不进项目目录。**

## 火山协议要点（照 koubo.py 验证过的实现，勿改字段位置）

- `POST https://openspeech.bytedance.com/api/v3/tts/unidirectional`，SSE 流式。
- 头：`X-Api-App-Id` / `X-Api-Access-Key` / `X-Api-Resource-Id` / `X-Api-Request-Id`(uuid)。
- Resource 路由：speaker `S_` 前缀 → `seed-icl-2.0`，否则 → `seed-tts-2.0`。选错报 55000000 mismatch / 45000030 not granted（后者=账号未开通大模型语音合成）。
- 体：`{"user":{"uid":"sky-film"},"req_params":{"text","speaker","audio_params":{"format":"wav","sample_rate":48000,"speech_rate"?},"model":"seed-tts-2.0-expressive","tone_fidelity":true}}`。**speech_rate 只放 audio_params 才生效**（放顶层被静默忽略）；绝对值非增量，-50~100。
- 响应：SSE `data:` 行 JSON，音频 base64 在 `data` 字段，结束码 `20000000`；非 0/None 的 code 都是错。收不到完整结束标志不落盘。
- 网络超时 = 结果未知（可能已计费）：报告用户核对，不自动重试同 request。

## 验收

- 每句 WAV 用 ffprobe 量时长写进 cues；总时长 = Σ(句长+gap)。
- 正式片抽听：首句、含数字句、末句（数字读音最常错，如 "14.14 亿"；不顺就改中文写法）。
- 拼接处响度一致（系统声与火山混用会跳变，尽量避免混用）。
