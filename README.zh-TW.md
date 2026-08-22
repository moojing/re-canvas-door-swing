# Retro Horror Door Monorepo

**語言：** [English](README.md) | [繁體中文](README.zh-TW.md)

此 monorepo 包含兩個 npm workspace：

- `packages/door-lib`（`retro-horror-door`）：可重複使用的復古恐怖開門轉場 library，提供 vanilla JS API。
- `packages/sample`（`retro-horror-door-sample`）：用於開發與驗證 library 的 Vite app。首頁是可播放的 preset catalog，也保留 PoC gallery 與純 HTML vanilla 範例。

## 快速開始

```sh
npm install
npm run build:lib        # 建置一次 library（tsup）
npm run dev              # 啟動 sample（使用已建置的 library）
```

開啟 `http://127.0.0.1:5173/` 可瀏覽所有已發布的 preset。每張卡會顯示 renderer 的初始畫面；按下 **Open preset** 會以 modal 開啟相同的 vanilla renderer，並提供播放控制、音效與可拖曳的時間軸。較早的技術 PoC 位於 `/poc`，獨立的 HTML 範例位於 `/samples/vanilla.html`。

常用指令：

- `npm run dev:lib`：監看並重建 library
- `npm run dev:sample`：啟動 sample 的 Vite 開發伺服器
- `npm run build`：依序建置 library 與 sample
- `npm run lint`：執行 sample lint
- `npm run gallery:check`：檢查已發布的評估 gallery 是否一致，並確認主 repo 未重新加入重複的評估文件

## Library 測試

door library 透過分層測試維持 framework-free：

- `npm run test:lib:core`：覆蓋 framework-free 的動畫狀態、preset、音效與 controller 行為。
- `npm run test:lib:package`：檢查公開 package exports，並確認預設 `retro-horror-door` entry 和 `retro-horror-door/vanilla` output graph 不含 React。
- `npm run test:lib:browser`：執行純 HTML mount 與 preset catalog 的 browser coverage，包括 canvas rendering、播放、音效、modal lifecycle、時間軸 seek 及 mobile close control。
- `npm run verify:lib` / `npm run verify:lib:core`：執行目前的 core 驗證流程：library typecheck、build 與 core tests。
- `npm run verify:lib:boundary`：執行 package-boundary 測試層。
- `npm run verify:lib:browser`：執行 core verification 加上 browser smoke tests。

在發布 renderer 或 catalog 變更前，請執行 `npm run verify:lib:browser`。Browser 驗證需要可綁定的本機 dev server，以及已安裝的 Playwright browser runtime。

此 library 不會安裝或發布 React、React DOM 或 R3F dependencies。

## 評估 Gallery

持續進行的門影片評估位於 [moojing/re-door-gallery](https://github.com/moojing/re-door-gallery)。建議將它 checkout 成相鄰目錄 `../re-door-gallery`。

`../re-door-gallery/docs/` 是三份評估紀錄的唯一來源：`door-classifications.md`、`door-classification-report.md` 和 `Doors-Difficulity-Estimation.xlsm.csv`。此 repository 保存這些紀錄的工具與 guardrails，但不應在本機追蹤重複副本。變更評估紀錄後請執行 `npm run gallery:check`；檢查仍過期時，評估工作尚未完成。

## 使用 Library

```ts
import { mountDoorEntrance } from "retro-horror-door";

mountDoorEntrance({
  target: document.getElementById("door-root"),
  preset: "single-lever-wood",
});
```

隨機選取只會從可用的 runtime preset 中選擇，不會手動混合不同門部件：

```tsx
mountDoorEntrance({
  target: document.getElementById("door-root"),
  random: true,
  type: "single",
});
```

純 HTML：

```html
<div id="door-root"></div>
<script type="module">
  import { mountDoorEntrance } from "retro-horror-door";
  mountDoorEntrance({
    target: document.getElementById("door-root"),
    preset: "single-lever-wood"
  });
</script>
```

Runtime preset entries 只包含可播放的 library 設定，例如 type、motion、handle、material、sound 與 camera behavior。Preset 也可提供 `frontTextureUrl`、`edgeTextureUrl` 與 `backTextureUrl`：沒有 edge 或 back 時，會沿用 front texture。舊的 `textureUrl` 欄位仍受支援，並會將相同 texture 套用到三個表面。來源影片、分類筆記與縮圖 reference 屬於開發追蹤文件，不會隨 npm package 發布。

## 全螢幕頁面轉場

進行頁面切換時，在 app 啟動時 mount 一個 viewport 尺寸的 vanilla door overlay。Overlay 應保留在 DOM 中，並使用 opacity 與 `pointer-events` 隱藏 idle state，而非使用 `display: none`。這樣 renderer 在使用者開始轉場時已經有正確尺寸並可立即播放。

請在觸發 navigation 的使用者動作中同步呼叫 `reset()` 與 `play()`。點擊是瀏覽器允許播放開門音效的必要條件。只在 `onComplete` 中 navigation，讓離開中的頁面維持顯示直到所選 preset 播放結束。

```ts
import { mountDoorEntrance } from "retro-horror-door";

const overlay = document.getElementById("door-transition");
const door = mountDoorEntrance({
  target: overlay,
  preset: "single-lever-wood",
  autoPlay: false,
  className: "h-full w-full border-0 bg-black",
  onComplete: () => window.location.assign("/next-page"),
});

document.querySelector("#continue")?.addEventListener("click", () => {
  const preset = "double-lever-wood";
  overlay?.classList.add("is-visible");
  door.reset(preset);
  door.play(preset);
});
```

Sample catalog 的 **Full-screen page transition** 區塊提供此流程的實作範例。
