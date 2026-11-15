# 第一人稱穿門：全 preset 檢查（2026-11-15）

## 結論與界線

已檢查12個現行preset及2個舊黃門相容性preset，各有desktop1440×900、tablet768×1024、phone390×844，共42個視圖。實際renderer在40ms網格與事件±1ms共5931個未全黑取樣點，確認保護末端後的補償為固定world-space平移，視線quaternion維持作者原始camera tracks；最大偏移誤差小於1e-8、視線誤差小於1e-10。**這證明沒有新增的responsive追門／繞門，不證明原有profile、材質、把手或每一格畫面已完全符合原片。**

8支已實作來源與舊黃門來源均已直接查看本機MP4，雜湊與gallery索引一致。原片判讀與runtime幾何診斷分開：門面變窄、門邊換位、兩側把手出現，不能單獨證明原片露出另一個門面，也不能反推原引擎鏡頭繞行。先前對目字門Enter／停車場原片「確定露背」的說法已撤回；不得作為保留runtime不自然視角的理由。No-handle未實作的第二段亦不作這種推論。

## Runtime 結果

每列的三裝置皆通過「補償不額外繞門／保留作者視線」測試。下列幾何標記只代表重建模型中back plane可見，不等於原片的同一視覺現象，也不等於新增orbit。診斷材質會忽略retro snapping等表面shader細節，小邊條需以實際材質再看。

| Preset／方向 | 幾何back-plane候選（runtime毫秒） | 實際畫面複查／剩餘工作 |
| --- | --- | --- |
| S9狂奔 Enter | 三裝置未標記 | 已開門的原有面持續放大；來源尾段淡出／精確比例仍近似。 |
| 鐵窗 Enter | 三裝置未標記 | 本次修正的手機追門／繞背問題未再出現；desktop尾段仍比原片較晚變黑，不宣稱逐格一致。 |
| 鐵窗 Leave | desktop3800起、tablet3840起；phone無 | 原有profile的幾何側別候選，不是responsive額外orbit；需連同原片可見輪廓校準，不能判原片也見背面。 |
| 鐵門 Enter | 三裝置未標記 | 寬門面逐步放大，未見額外跳側。 |
| 鐵門 Leave | desktop／tablet4640起；phone無 | 很晚且已淡出中的幾何側別候選；需按實際可見亮度核對，不直接列成明顯繞背。 |
| 1998無把手 Enter | 三裝置未標記 | desktop／tablet末段右側大面比來源尾段窄條更突出，需校準構圖及fade；phone裁切較早。 |
| 停車場 Enter | desktop3800、tablet3840、phone3920起 | 原有profile幾何側別候選；原片門邊／鎖投影不能證明換面。需依來源外觀核對。 |
| 目字門 Enter | desktop／tablet4120起；phone無 | 4000附近厚邊與兩顆亮旋鈕過度突出；desktop末段保留較大近面。需來源校準。 |
| 目字門 Leave | desktop4080起；tablet／phone無 | 同樣厚邊／旋鈕近景比例問題，不能僅由投影斷定原片正反面。 |
| B07自動門 Enter | 三裝置未標記 | 正面水平分開，未見旋轉或額外追門。 |
| B07自動門 Leave | 三裝置未標記 | 同上；來源精確淡出／音軌仍未認證。 |
| 藍色雙門 Enter | 三裝置未標記 | 左葉開啟、右葉正面保留；稀疏分鏡不認證完整尾段速度，維持既有時序。 |
| 舊黃門 Enter | 三裝置未標記 | 厚邊與雙旋鈕比原片末段更突出，需含fade播放核對。相容性來源，不增加35支來源數。 |
| 舊黃門 Leave | 三裝置未標記 | 原先寬門面與旋鈕逐步放大，未見額外跳側；來源比例仍近似。 |

幾何候選的最早時間由所有取樣的min計算，不使用事件append順序。畫面分鏡有標示時間；不得從非等間距或非時序格子推斷速度反向。14個audit tests通過代表檢查成功執行及camera不變量成立，**不是14個來源全部視覺驗收通過**。

## 方法與重跑

`packages/door-lib/tests/browser/all-doors-passage-audit.test.ts`：

- 透過實際Mesh.onBeforeRender取得renderer、scene及最終camera，不只重算理論camera。
- 每個取樣比較最終camera與作者position／target；保護末端後補償不得改變，quaternion不得新增轉向。
- 暫時把front plane塗綠、back plane塗紫、其他幾何塗黑，保留原culling／depth及陣列材質groups，讀取GL像素，再還原原材質。
- 幾何側別資料包含fade比例；另外產生原材質＋實際CSS fade分鏡供人眼核對。所有14×3視圖的材質分鏡均已查看。
- renderer像素、原片影像與引擎三維路徑是不同層次的證據；不把其中一層的結果替代另一層。

```sh
npx playwright test --config packages/door-lib/tests/browser/playwright.config.ts all-doors-passage-audit.test.ts --workers=2
```

預設測試埠若被其他專案占用，另設DOOR_TEST_URL、DOOR_CALIBRATION_TEST_URL、DOOR_PRODUCTION_TEST_URL。報告附件為各裝置原材質分鏡及all-device-face-audit JSON。本次本機完整資料另存於ignored `materials/first-person-audit-2026-11-15/`；原MP4及原片抽格仍只在gallery ignored materials中。沒有來源影像進入runtime package或本repo版控。

## 狀態

以下是檢查完成當時的本機狀態；檢查程式及同分支修正的交付／合併狀態以[PR #86](https://github.com/moojing/re-canvas-door-swing/pull/86)為準，未包含npm發布。

此輪新增檢查與報告，未再修改profile／素材／renderer。現有未提交Stage1與第一人稱renderer修正仍在`feat/ticket-72-camera-authoring-stage1`，未合併／未發布。全門來源視覺QA不能結案，待校準項仍屬#58；#63來源數維持8／35、27待實作。
