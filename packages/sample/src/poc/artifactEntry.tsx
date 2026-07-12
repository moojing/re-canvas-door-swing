// 單檔 demo 專用入口(vite.artifact.config.ts):把 poc-a11 貼圖請求導向
// 內嵌 data URI,讓整頁可離線自足地跑在 CSP 沙箱(如 claude.ai artifact)裡。
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import "../index.css";
import HeavyWaterDoorA11 from "./HeavyWaterDoorA11";
import { TEXTURE_DATA } from "./artifactTextures";

const originalLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function (url: string, ...rest: any[]) {
  const match = /poc-a11\/(.+)$/.exec(url);
  const override = match ? TEXTURE_DATA[match[1]] : undefined;
  return originalLoad.call(this, override ?? url, ...rest);
};

createRoot(document.getElementById("root")!).render(<HeavyWaterDoorA11 />);
