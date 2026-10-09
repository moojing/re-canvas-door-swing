---
name: calibrate-door-animation
description: Use when an existing re-canvas-door-swing door preset differs from its reference animation in opening angle, pauses, approach, framing, passage or fade, including 校準動畫、微調 animation set、比對原片 and work without local MP4 files.
---

# Calibrate Door Animation

校準指定 preset／方向的實際行徑。Gallery 保存來源觀察，swing 保存實作擬合值；
影片中的畫面現象不能唯一反推角度、FOV 或 camera Z。

## 找對版本與證據

- 讀專案 `AGENTS.md`。以使用者指定的完整 preset ID 和 Enter／Leave 為範圍；
  不把 Enter 等同內推、Leave 等同外拉。先 Restore preset values 再 Reset，確認顯示的 set、checkout 與執行中的 server；
  舊截圖可能描述已修正的版本，不直接重套歷史數值。
- 依 `presets.ts` → `animationSets.ts` → `animationStyles.ts` 追實際設定。
  列出同一 set 的全部使用者，包括 style-only fallback；共享曲線的修改會一起影響它們。
- Gallery 可用 `DOOR_GALLERY_ROOT` 指定；一般是 sibling `re-door-gallery`。
  在 `.worktrees/` 裡不要直接假設 `../re-door-gallery`，先定位主 checkout。
- 先讀 gallery `docs/door-animation-reference.md`，再依完整原片 `id` 查
  `stakeholder-selection.json` 的 `video`、`gif`、`gifSource`。S 編號和 GIF 索引未必相同；
  外觀來源與時序來源也可能不同。該索引不存在時，從 manifest／分類記錄建立證據表。
- 原片可用時查看對應段落，在微開、停頓、後段和淡出附近密集取樣；抽格保持 local-only。
  檔案秒數、段落起點、實作毫秒分開記錄，不能直接套用同一時間。
- 無 MP4 時使用 **已追蹤** `selection-gifs/` 和 gallery 文字觀察，照樣完成有依據的校準。
  GIF 含去回與遊戲畫面，低 fps、補黑邊且無聲；核對 metadata，量占比時使用有效影片區。
  用 `git -C <gallery> ls-files -- <reference-doc> <gif>` 核對文字和 GIF 均將隨版本交付。
  可用 Pillow 在記憶體讀 GIF 並選格查看，不必抽出或追蹤原片 frame。
  未追蹤筆記、失效本地路徑、runtime 截圖或擬合值都不是可攜原片證據。
  若資料無法判斷某項，保留未知並說明缺少的證據，不捏造精確角度、短停頓或聲音結果。

## 決定修哪一條曲線

把關门靠近、配件、微開、停頓、後續旋轉、前進、通過、淡出分開比較。
同 viewport／aspect 比較門高占比、上下裁切、鉸鏈／自由邊位置、正面和側面寬度；
先確認畫面差異，再固定其他變量試調角度或鏡頭。

| 現象 | 檢查 |
| --- | --- |
| 開場偏小、只裁切下方 | initial Z、camera target、高度／aspect；上下投影分別量測 |
| 看起來開得不夠 | angle track、鉸鏈／方向、camera；角度數字相同不保證輪廓相同 |
| 微開後卡住或突然衝過門 | 相鄰 keyframe 的角速度／位移速度與 easing；只保留原片支持的停頓 |
| 提早只剩黑畫面 | 門離開視野時間、通過曲線、fade 起點；先修可見性而非只延長 fade |
| 拉近後把手過大 | 真實模型投影與近裁切；不要只用裸門板的幾何測試判定吻合 |

若現有 set 的基本流程吻合，修它；若只要改其中一個方向且完整路徑不同，新增按行為命名的
可重用 set 並改該 preset 分配。不要加 hidden preset-ID overrides，也不要按年份全體修改。
單一 preset 使用一組是允許的。保留已授權的修改範圍；聲音、把手或其他方向只在有需要時調整。

Enter／Leave 控制必須選擇完整已註冊 preset（含 `traversal`，去回配對用 `variantOf`）。
不能把 Toward／Away 旋轉 override 換名充當去回；只有 Enter 時只顯示 Enter，
缺少反向段落證據時不宣稱 Leave 已校準。

## 驗證與交接

- 對實際差異寫 focused regression：停頓位置、速度連續性、初始占比、上下投影裁切、
  淡出前門仍可見。角度以 `doorAngle × 90` 解讀目前 renderer，不能寫成原片量測值。
- 執行相關 core／package／browser 測試及 lint、build。已有測試對舊共用分組的假設要更新。
- 用專案本地 sample 看 closed、micro-hold、opening、passage、fade，並播放完整動畫；
  確認 Play、Reset、seek、全螢幕與涉及的去回切換。T3 提供 preview 工具時優先使用。
  也檢查真實把手、正反面及側邊，不只檢查抽象投影數值。
- 新的原片觀察／來源映射寫到 gallery `docs/door-animation-reference.md`，含段落、
  時間、證據來源、解析度／fps 和未驗證項目。不複製整份分類或 CSV 到 swing。
  擬合值、變更理由、測試與 runtime 截圖寫到 swing 的最新日期校準章節。
- Gallery 資料變更後，從 swing 執行 `DOOR_GALLERY_ROOT=<gallery> npm run gallery:check`。
  不為了過檢查而重寫 manifest、追蹤 materials 或覆蓋既有工作；精確報告阻擋原因。
- 交付說明：改哪個 preset／set、影響哪些方向、看了哪種證據、驗證了什麼、
  哪些仍是近似。測試通過不等於逐格忠於原片；沒有原片時更不能宣稱已驗聲音。

## 現有專案入口

- swing `docs/animation-style-1996.md`：set 契約。
- swing `docs/era-animation-calibration-2026-10-05.md`：讀最後日期章節，前面是歷史。
- gallery `docs/door-animation-reference.md`：來源與觀察，包含目前批次去回映射。
- 建立新模型／材質的工作另用 `prototype-door-animation`；此 skill 專注既有行徑校準。
