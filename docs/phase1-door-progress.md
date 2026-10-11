# Phase 1：35 支門動畫實作進度總覽

線上總覽：[GitHub #63](https://github.com/moojing/re-canvas-door-swing/issues/63)；本文件為 repo 內的對照版本。

更新日期：2026-10-11。這是 runtime 實作追蹤，不是門分類資料的副本。
原始選單依 2026-08-25 匯出的 35 支影片、20 個分類；分類與影片仍由 sibling `re-door-gallery` 管理。

## 目前進度

| 範圍 | 數量 | 說明 |
| --- | ---: | --- |
| 原選單已合併 main | 6 / 35 | 三支無配件單門、藍色 B02 S3 雙門、1998 A03 S2目字門及1996 B07 S1自動滑門；B07由 [PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66) 合併。 |
| 本機完成／待合併 | 0 / 35 | B07 S1 Enter／Leave 已合併；新素材與 library 尚未發布。 |
| 尚待實作 | 29 | 尚無對應的 runtime preset。 |
| 選單外相容性 preset | 1 支門 | 黃色 A02 S5 已退出 catalog／random，舊 ID 保留；不取代 S9。 |

「已合併」表示 main 已有該影片對應的完整 preset、runtime 素材與 renderer 支援，
不代表所有正反向穿越均已精確校準，或現有音效是原片音軌。
本機 catalog 的9個 presets 包含6支基礎門與3個 Leave 變體；原選單為6支已合併、0支僅本機完成。
第05支由 [PR #65](https://github.com/moojing/re-canvas-door-swing/pull/65) 合併；第24支由 [PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66) 合併。尚未發布新 package。
本表不將分類 ticket 的 Done／In Progress 直接套到分類內所有影片。

## 35 支逐支清單

| 編號 | 原片識別 | 分類 ticket | 實作狀態 | Runtime preset | 剩餘工作 |
| --- | --- | --- | --- | --- | --- |
| 01 | `1-1/a01/a01-s1鐵門.mp4` | [#30](https://github.com/moojing/re-canvas-door-swing/issues/30) | 已實作 | `biohazard-1996-a01-iron-door` | 年代／反向穿越後續 QA 見 [#58](https://github.com/moojing/re-canvas-door-swing/issues/58)。 |
| 02 | `1-2/a01/a01單門-無把手.mp4` | [#30](https://github.com/moojing/re-canvas-door-swing/issues/30) | 已實作 | `biohazard-1998-a01-no-handle-door` | 年代／反向穿越後續 QA 見 [#58](https://github.com/moojing/re-canvas-door-swing/issues/58)。 |
| 03 | `1-3/a01/a01-s2停車場門.mp4` | [#30](https://github.com/moojing/re-canvas-door-swing/issues/30) | 已實作 | `biohazard-1999-a01-parking-door` | 年代／反向穿越後續 QA 見 [#58](https://github.com/moojing/re-canvas-door-swing/issues/58)。 |
| 04 | `1-1/a02/a02-s9紅十字門開門狂奔.mp4` | [#31](https://github.com/moojing/re-canvas-door-swing/issues/31) | 待實作 | — | 實作 S9 狂奔動作；S5 黃色門不能算此片完成。 |
| 05 | `1-2/a03/a03-s2目字門.mp4` | [#31](https://github.com/moojing/re-canvas-door-swing/issues/31) | 已合併／待發布 | `biohazard-1998-a03-grid-knob-door`（另有 Leave） | 發布新素材／library；去回精細時序及原音軌仍為近似。 |
| 06 | `1-3/a02/a02-s1 鐵窗門.mp4` | [#31](https://github.com/moojing/re-canvas-door-swing/issues/31) | 待實作 | — | 素材、preset、來源動畫校準及驗證。 |
| 07 | `1-1/a03/a03-s2紅十字門.mp4` | [#32](https://github.com/moojing/re-canvas-door-swing/issues/32) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 08 | `1-1/a03/a03-s4紅花紋門.mp4` | [#32](https://github.com/moojing/re-canvas-door-swing/issues/32) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 09 | `1-3/a07/a12-s1鐵門.mp4` | [#32](https://github.com/moojing/re-canvas-door-swing/issues/32) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 10 | `1-3/a03/a03-s1目鐵門.mp4` | [#33](https://github.com/moojing/re-canvas-door-swing/issues/33) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 11 | `1-3/a03/a03-s2鐵門.mp4` | [#33](https://github.com/moojing/re-canvas-door-swing/issues/33) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 12 | `1-1/a06/a05-s4黃目字門.mp4` | [#34](https://github.com/moojing/re-canvas-door-swing/issues/34) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 13 | `1-2/a05/05-s1通風鐵門.mp4` | [#35](https://github.com/moojing/re-canvas-door-swing/issues/35) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 14 | `1-2/a08/a08-s1自動旋轉門把.mp4` | [#36](https://github.com/moojing/re-canvas-door-swing/issues/36) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 15 | `1-2/a11/a11-s1重型水門.mp4` | [#36](https://github.com/moojing/re-canvas-door-swing/issues/36) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 16 | `1-3/a04/a04-s1圓環把手.mp4` | [#36](https://github.com/moojing/re-canvas-door-swing/issues/36) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 17 | `1-1/b02/b02-s3方塊門.mp4` | [#37](https://github.com/moojing/re-canvas-door-swing/issues/37) | 已實作；含校準修正 | `biohazard-1996-b02-blue-panel-double-door` | 本次變更（[PR #64](https://github.com/moojing/re-canvas-door-swing/pull/64)）提供校準修正，合併狀態以 PR 為準；後續發布仍待完成，正反向／完整來源 QA 仍由 #58 追蹤。 |
| 18 | `1-2/b04/b04-s2下通風紅木門.mp4` | [#37](https://github.com/moojing/re-canvas-door-swing/issues/37) | 待實作 | — | 素材、preset、來源動畫校準及驗證。 |
| 19 | `1-3/b03/b03-s3時鐘塔大門.mp4` | [#37](https://github.com/moojing/re-canvas-door-swing/issues/37) | 待實作 | — | 素材、preset、來源動畫校準及驗證。 |
| 20 | `1-1/b03/b03-s1 曲線門.mp4` | [#38](https://github.com/moojing/re-canvas-door-swing/issues/38) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 21 | `1-3/b02/b02-s1窗木門.mp4` | [#38](https://github.com/moojing/re-canvas-door-swing/issues/38) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 22 | `1-1/b04/b04-s2 田字門.mp4` | [#39](https://github.com/moojing/re-canvas-door-swing/issues/39) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 23 | `1-1/b01/b01-s1鐵門.mp4` | [#40](https://github.com/moojing/re-canvas-door-swing/issues/40) | 待實作 | — | 可沿用鉸鏈基礎；新增本片素材與所需硬體／動畫，完成驗證。 |
| 24 | `1-1/b07/b07-s1雙門自動門.mp4` | [#41](https://github.com/moojing/re-canvas-door-swing/issues/41) | 已合併／待發布 | `biohazard-1996-b07-automatic-sliding-door`（另有 Leave） | [PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66) 已合併；素材／library 發布待完成；已套用 Kyodon CC0 自動門音效及黑畫面尾聲淡出；閉門80%構圖校準本機完成／待合併；原音軌及去回精細 QA 仍為近似。 |
| 25 | `1-2/b07/b07-s1大電梯門.mp4` | [#41](https://github.com/moojing/re-canvas-door-swing/issues/41) | 待實作 | — | 新增中分滑動支援、本片素材與時間軸；只做門體轉場。 |
| 26 | `1-3/b06/b06-s1處理廠電梯門.mp4` | [#41](https://github.com/moojing/re-canvas-door-swing/issues/41) | 待實作 | — | 新增中分滑動支援、本片素材與時間軸；只做門體轉場。 |
| 27 | `1-2/b05/b05-s1纜車門1.mp4` | [#42](https://github.com/moojing/re-canvas-door-swing/issues/42) | 待實作 | — | 新增中分滑動支援、本片素材與時間軸；只做門體轉場。 |
| 28 | `1-2/b05/b05-s1纜車門2.mp4` | [#42](https://github.com/moojing/re-canvas-door-swing/issues/42) | 待實作 | — | 新增中分滑動支援、本片素材與時間軸；只做門體轉場。 |
| 29 | `1-2/b08/b08-s1列車門.mp4` | [#43](https://github.com/moojing/re-canvas-door-swing/issues/43) | 待實作 | — | 新增中分滑動支援、本片素材與時間軸；只做門體轉場。 |
| 30 | `1-2/a09/a09-列車門.mp4` | [#44](https://github.com/moojing/re-canvas-door-swing/issues/44) | 待實作 | — | 新增單扇水平滑動支援、本片素材及配件，再校準／驗證。 |
| 31 | `1-3/a08/a08-s1電車門.mp4` | [#45](https://github.com/moojing/re-canvas-door-swing/issues/45) | 待實作 | — | 新增單扇水平滑動支援、本片素材及配件，再校準／驗證。 |
| 32 | `1-3/a08/a08-s2電車車廂門.mp4` | [#46](https://github.com/moojing/re-canvas-door-swing/issues/46) | 待實作 | — | 新增單扇水平滑動支援、本片素材及配件，再校準／驗證。 |
| 33 | `1-2/a10/a10-s1實驗室.mp4` | [#47](https://github.com/moojing/re-canvas-door-swing/issues/47) | 待實作 | — | 新增垂直位移支援、本片素材／操作件，再校準／驗證。 |
| 34 | `1-2/b10/b10-s1下水道閘門.mp4` | [#48](https://github.com/moojing/re-canvas-door-swing/issues/48) | 待實作 | — | 新增垂直位移支援、本片素材／操作件，再校準／驗證。 |
| 35 | `1-2/a02/a02窄雙扇門公車門.mp4` | [#49](https://github.com/moojing/re-canvas-door-swing/issues/49) | 待實作 | — | 新增折疊壓縮幾何與動畫、本片素材，再校準／驗證。 |

## 選單外實作與共用工作

- `1-1/a02/a02-s5黃目字門.mp4`：舊 Enter／Leave ID 保留相容性，但已退出本機 catalog／random；之前誤做的黃色代表門已由第05支1998目字門取代，不取代第04支S9。
- 鐵門另有 `biohazard-1996-a01-iron-door-leave`；變體不新增原選單完成數。
- [#58 年代動畫與方向 QA](https://github.com/moojing/re-canvas-door-swing/issues/58)：共用 animation sets 已合併；完整方向／來源 QA 仍未結案；本次交付雙門鏡頭與聲音修正。
- [#29 最終 catalog／發布驗證](https://github.com/moojing/re-canvas-door-swing/issues/29)：目前 catalog 基礎已完成，35 支全部完成後的完整驗證仍待執行。

## 建議下一步

第24支 B07 S1 中分滑動與音效收尾已由 [PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66) 合併；接續素材／library 發布與去回精細 QA。
下一個尚未實作的種類可選第30支單扇水平滑動（#44）、第33支垂直位移（#47）或第35支折疊雙門（#49）。同分類電梯門可沿用滑動機制，但需各自素材與來源校準。

## 更新規則

每新增或校準一支門，同步更新此總覽的「實作狀態、Runtime preset、剩餘工作」、
對應分類 ticket 的 Source Doors，以及 Project 分類狀態。
僅本機完成時寫「本機完成／待合併」，不要寫已發布。
新增 Leave 變體、共用把手或 renderer 支援，不會自動完成另一支影片。
原選單調整必須先在 gallery 確認，再更新 runtime backlog。


## 回連與完成檢查

20 張分類票 #30–#49 及共用工程票 #24–#29、#58 均有回連到 #63。
`AGENTS.md` 已要求實作、校準、合併或發布時同步總覽、此文件、分類票及看板。
目前是雙向參照與更新規則，沒有自動同步機制；結案前必須核對相應影片列。


## B07 sound-tail update — 2026-10-11
B07 S1 Enter/Leave now hold black with continuing Kyodon sound after picture fade: picture black5.00s, full-volume sound to5.25s, linear400ms audio fade ending5.65s. Source1.64s–end maps to timeline3.35–5.65s at approximately1x. Shared set and preview timing edits carry the audio fade; Reset/replay restore volume. This is an authored sound arrangement, not original source audio.

Fresh verification:88 core +2 local asset tests,16 package tests,2 focused browser tests covering both traversals and catalog/full-screen controls; lint/build pass (3 existing Fast Refresh warnings). Local/pending merge and publication; counts remain5 merged +1 local. #41 remains In Progress with the two elevator sources pending.


## B07 delivery review — 2026-10-11

[PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66) delivers B07 S1 Enter/Leave, reusable
center-split leaf displacement, generated material and Kyodon sound with the
5.00–5.65s black/audio tail. PR state is authoritative for merge status; this
record does not claim pending work is merged or published. Delivery branch is
`feat/ticket-41-b07-delivery`; the original implementation branch is preserved.
Category #41 has two elevator sources pending; #28 retains single-slide,
vertical and folding scope. Original35 counts remain5 merged +1 local until
merge is verified. Assets and library publication are separate follow-up work.


## B07 verified merge — 2026-10-11

[PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66) merged after
user confirmation of reviewed head `74ebad7680d0aa8e8328d2b73a8b9c2d06fefb13`.
Merge commit: `2fd3959ab544d234740871825e6f3eec8a6aceb1`.
Independent reviewer found no actionable findings. Verification:88 core +2 local
assets,16 package,41 browser tests; lint/build pass with3 existing lint warnings.
B07 counts as one of the original35 sources; Leave adds no source count.
Current count:6 merged,0 local-only,29 pending. #41 remains In Progress for
its two elevator sources; #28/#29/#58 and #63 remain open for their broader scope.
No assets/library publication occurred; source timing/reverse-face/original audio
limits remain as documented. Earlier local/pending entries above are history.
