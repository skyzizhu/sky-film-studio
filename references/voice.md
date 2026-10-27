# 语音与时间轴

## 两种时间策略

**逐句 TTS**：每句独立文件，可重新落位。say 生成自然时长；plan 只出 `film_beats_draft.json`，不碰现有 film/cues。审阅后 `plan --apply` 将新分镜应用并落位。手改 beats 的边界或句子分组后跑 place；漏句、重复索引、超拍/超片长时拒绝写入。每拍首句起点为 beat.start+lead，后续句累计真实时长+gap。规划会为 lead、间隙和片尾留空间。

**用户录音**：整段音频从源 0 秒播放，cues.start/end 是源时间码，同时保留 source_start/source_end。plan 让镜头包络这些源句段；不要 place。需要重排录音时，另行实际切片/交叉淡化，再为切片定义播放时间，不能只移动字幕。

共享 cues 能保证共同使用时间表，不能证明听觉对齐。精确到词的动作需词级时间戳或人工试听事件点。字幕烧帧；cues 改动后必须重混音及重渲。

## 命令与缓存

```sh
python3 "$S/engine/voice.py" say --project "$FILM" --mode system --reuse
python3 "$S/engine/voice.py" plan --project "$FILM"
# 审阅 film_beats_draft.json；若需要手改草案，将其合并到 film.json 后 place。
python3 "$S/engine/voice.py" plan --project "$FILM" --apply
python3 "$S/engine/voice.py" place --project "$FILM"
```

plan --apply 会重新生成草案，若已编辑草案，应手工合并后 place，而不是用 --apply 覆盖编辑。录音手工合并后直接预检。

--reuse 按文本、角色、服务、音色、语速、模型/采样率及裁剪版本生成内容缓存键，检查 WAV 和散列；插句不会把旧序号音频误当新稿。缓存位于 .cache/voice，不随交付打包。系统声 --voice 可指定已安装声音，暂不支持 --speech-rate。多角色前缀保留在 cues，当前每次 say 使用一个音色；没有自动多音色角色合成。

## 导入录音

```sh
python3 "$S/engine/voice.py" import --project "$FILM" --audio narration.wav --text narration.txt
# 或提供外部转录/强制对齐后校对的结果
python3 "$S/engine/voice.py" import --project "$FILM" --audio narration.wav --aligned-cues aligned.json
```

VAD 只检测能量活动，不能把停顿等同句子，不能自动转录。没有文稿时 text 留空，预检阻断缺字幕；有稿但句段数不同则报错，绝不截断文稿或补空。即使段数相同，也需抽听校对。强制对齐可用环境已有的工具；技能不假装内置了 ASR 服务。

aligned.json 格式：`{"alignment":{"reviewed":true},"sentences":[{"text":"已校对句子","start":1.2,"end":3.8}]}`。提供的时间码必须在音频内、非重叠且有文本。交付前需要 cues.alignment.reviewed:true；只能在实际校对完成后设置。

## 配置与云调用

解析顺序：--config > ~/.config/sky-film-studio/media.json > 兼容 ~/.config/huashu/media.json（只读）。音色：bindings.voices[ref].speaker_id > ~/.koubo/voices.json entry > 字面 S_/zh_ ID。项目不存凭证。

```json
{"preferences":{"voice":{"mode":"clone","voice_ref":"liufei"}},
 "policy":{"cloud":"allow","paid_api":"allow"},
 "bindings":{"volcengine":{"env_file":"~/.volc.env"},
             "voices":{"liufei":{"speaker_id":"S_你的音色ID"}}}}
```

凭证来自 VOLC_SPEECH_APPID/VOLC_SPEECH_TOKEN 或配置引用 env_file。CLI 仅在两个 policy 均 allow 时调用云；本次明确授权但配置未允许时，应选用符合授权的方式，不擅改全局配置。

当前火山协议保持已使用的 SSE 实现：S_ 音色走 seed-icl-2.0，其余 seed-tts-2.0；speech_rate 位于 audio_params。只在收到完整结束标记后落音频文件。网络结果未知可能已计费，报告后由用户核对，不自动重试。不在技能中宣称服务协议永久有效；服务端变更时以官方文档核对。

## 验收

预检检查源音频存在、时长与 cues 相符、句子覆盖及不重叠、句末不越拍/片末、淡出不截语音。再试听首句、含数字句、末句及拼接处。阅读速度超限应拆句/改稿，不只缩小字幕。最终 MP4 还需检查音轨和实际观看/试听。
