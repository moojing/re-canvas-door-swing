# Phase 1 Door Selection Reference

Source export: `/Users/mujingtsai/Downloads/door-selection-2026-08-25-first-bio123.json`
Exported at: `2026-08-25T06:21:39.429Z`
Selected count: `35`
Selected groups: `20`

This document records the Phase 1 stakeholder-selected reference doors for the canvas door animation package. It is a project reference only; runtime presets remain defined in package source.

Selection rule confirmed during review: no selected category should contain more than three doors. The current export satisfies that rule.

## Runtime Asset Notes

| Preset | Runtime asset | Provenance |
| --- | --- | --- |
| `biohazard-1996-a01-iron-door` | `packages/door-lib/src/assets/textures/biohazard-1996-a01-iron-door-front.webp` and `packages/door-lib/src/assets/textures/biohazard-1996-a01-iron-door-back.webp` | Original generated 1:2 albedo-style front texture created for `1-1/a01/a01-s1鐵門.mp4`, using the local gallery thumbnail, the user-provided handle crop, and approved concept direction only as visual references. The back texture is a horizontal mirror of the generated front so the handle appears on the opposite side. The runtime assets are WebP q85 exports; the PNG files are retained only as local/source masters while this preset is still in development. These are not copied frames or source-game assets. |

## Group Summary

| Count | Category | Source group | Group |
| ---: | --- | --- | --- |
| 3 | 鉸鏈單開 × 無配件 | 單門-無把 | `combo-630c2fea4869` |
| 3 | 鉸鏈單開 × 喇叭鎖 | 單門-喇叭鎖 | `combo-dba1d911caf2` |
| 3 | 鉸鏈單開 × 豎把 | 單門-垂直黃色門把 | `combo-d5358a9ade31` |
| 2 | 鉸鏈單開 × 橫把／推桿 | 單門-長型把手 | `combo-8cf522ede343` |
| 1 | 鉸鏈單開 × 彎把 | 單門-彎曲把 | `combo-dd197a7e03f8` |
| 1 | 鉸鏈單開 × 斜把 | 單門-細把手 | `combo-a5d2bb4bb6d9` |
| 3 | 鉸鏈單開 × 圓環／轉輪 | 單門-自動旋轉門把 | `combo-43213310d496` |
| 3 | 鉸鏈雙開 × 喇叭鎖 | 雙門-喇叭鎖 | `combo-569ac8db9482` |
| 2 | 鉸鏈雙開 × 豎把 | 雙門-豎把 | `combo-75e86d69446e` |
| 1 | 鉸鏈雙開 × 橫把／推桿 | 雙門-橫把 | `combo-4c6a3a2d5a6d` |
| 1 | 鉸鏈雙開 × 門栓鎖 | 雙門-無把 | `combo-26812ebf9089` |
| 3 | 中分滑動(雙扇對開) × 自動（無配件） | 雙門自動門 | `combo-2683870aa595` |
| 2 | 中分滑動(雙扇對開) × 豎把 | 雙門-纜車門 | `combo-220a6ac32aae` |
| 1 | 中分滑動(雙扇對開) × 圓環／轉輪 | 雙門-列車門 | `combo-ec192427092a` |
| 1 | 水平滑動(單扇) × 無配件 | 單門-列車門 | `combo-c15225885ed6` |
| 1 | 水平滑動(單扇) × 豎把 | 輕軌-電車門 | `combo-2a90ff118f81` |
| 1 | 水平滑動(單扇) × 橫把／推桿 | 輕軌-電車門 | `combo-689498409155` |
| 1 | 垂直移動/捲升 × 自動（無配件） | 單門-實驗室 | `combo-5f3d5a5baa17` |
| 1 | 垂直移動/捲升 × 環境操作件 | 下水道閘門 | `combo-e3b99cba4928` |
| 1 | 折疊/摺疊壓縮 × 自動（無配件） | 窄雙門-公車門 | `combo-78016d974073` |

## Selected Doors

### 鉸鏈單開 × 無配件

- Source group: 單門-無把
- Group: `combo-630c2fea4869`
- Skeleton: 鉸鏈單開
- Accessory: 無配件
- Parent material: 鏽鐵平面板+鉚釘框+鎖孔面板貼圖
- Selected count: 3

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | a01 | 鐵門 | 鐵門 | `1-1/a01/a01-s1鐵門.mp4` |
| 1998 · Biohazard 2 | a01 | a01單門-無把手 | a01單門-無把手 | `1-2/a01/a01單門-無把手.mp4` |
| 1999 · Biohazard 3 | a01 | 停車場門 | 停車場門 | `1-3/a01/a01-s2停車場門.mp4` |

### 鉸鏈單開 × 喇叭鎖

- Source group: 單門-喇叭鎖
- Group: `combo-dba1d911caf2`
- Skeleton: 鉸鏈單開
- Accessory: 喇叭鎖
- Parent material: 木鑲板×7、鐵門×1、狂奔版×1
- Selected count: 3

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | a02 | 紅十字門開門狂奔 | 紅十字門開門狂奔 | `1-1/a02/a02-s9紅十字門開門狂奔.mp4` |
| 1998 · Biohazard 2 | a03 | 目字門 | 目字門 | `1-2/a03/a03-s2目字門.mp4` |
| 1999 · Biohazard 3 | a02 | 鐵窗門 | 鐵窗門 | `1-3/a02/a02-s1 鐵窗門.mp4` |

### 鉸鏈單開 × 豎把

- Source group: 單門-垂直黃色門把
- Group: `combo-d5358a9ade31`
- Skeleton: 鉸鏈單開
- Accessory: 豎把
- Parent material: 木鑲板×5
- Selected count: 3

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | a03 | 紅十字門 | 紅十字門 | `1-1/a03/a03-s2紅十字門.mp4` |
| 1996 · Biohazard | a03 | 紅花紋門 | 紅花紋門 | `1-1/a03/a03-s4紅花紋門.mp4` |
| 1999 · Biohazard 3 | a07 | 鐵門 | 鐵門 | `1-3/a07/a12-s1鐵門.mp4` |

### 鉸鏈單開 × 橫把／推桿

- Source group: 單門-長型把手
- Group: `combo-8cf522ede343`
- Skeleton: 鉸鏈單開
- Accessory: 橫把／推桿
- Parent material: 工業金屬門×5(橫向壓條)
- Selected count: 2

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1999 · Biohazard 3 | a03 | 目鐵門 | 目鐵門 | `1-3/a03/a03-s1目鐵門.mp4` |
| 1999 · Biohazard 3 | a03 | 鐵門 | 鐵門 | `1-3/a03/a03-s2鐵門.mp4` |

### 鉸鏈單開 × 彎把

- Source group: 單門-彎曲把
- Group: `combo-dd197a7e03f8`
- Skeleton: 鉸鏈單開
- Accessory: 彎把
- Parent material: 木門×4(花紋變體)
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | a06 | 黃目字門 | 黃目字門 | `1-1/a06/a05-s4黃目字門.mp4` |

### 鉸鏈單開 × 斜把

- Source group: 單門-細把手
- Group: `combo-a5d2bb4bb6d9`
- Skeleton: 鉸鏈單開
- Accessory: 斜把
- Parent material: 灰鐵平面板(通風百葉/邊飾)
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | a05 | 05-s1通風鐵門 | 05-s1通風鐵門 | `1-2/a05/05-s1通風鐵門.mp4` |

### 鉸鏈單開 × 圓環／轉輪

- Source group: 單門-自動旋轉門把
- Group: `combo-43213310d496`
- Skeleton: 鉸鏈單開
- Accessory: 圓環／轉輪
- Parent material: 灰綠金屬平板(鋸齒頂緣)
- Selected count: 3

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | a08 | 自動旋轉門把 | 自動旋轉門把 | `1-2/a08/a08-s1自動旋轉門把.mp4` |
| 1998 · Biohazard 2 | a11 | 重型水門 | 重型水門 | `1-2/a11/a11-s1重型水門.mp4` |
| 1999 · Biohazard 3 | a04 | 圓環把手 | 圓環把手 | `1-3/a04/a04-s1圓環把手.mp4` |

### 鉸鏈雙開 × 喇叭鎖

- Source group: 雙門-喇叭鎖
- Group: `combo-569ac8db9482`
- Skeleton: 鉸鏈雙開
- Accessory: 喇叭鎖
- Parent material: 木門×4+日型鐵門
- Selected count: 3

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | b02 | 方塊門 | 方塊門 | `1-1/b02/b02-s3方塊門.mp4` |
| 1998 · Biohazard 2 | b04 | 下通風紅木門 | 下通風紅木門 | `1-2/b04/b04-s2下通風紅木門.mp4` |
| 1999 · Biohazard 3 | b03 | 時鐘塔大門 | 時鐘塔大門 | `1-3/b03/b03-s3時鐘塔大門.mp4` |

### 鉸鏈雙開 × 豎把

- Source group: 雙門-豎把
- Group: `combo-75e86d69446e`
- Skeleton: 鉸鏈雙開
- Accessory: 豎把
- Parent material: 墨綠雕花木門+X鐵門
- Selected count: 2

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | b03 | 曲線門 | 曲線門 | `1-1/b03/b03-s1 曲線門.mp4` |
| 1999 · Biohazard 3 | b02 | 窗木門 | 窗木門 | `1-3/b02/b02-s1窗木門.mp4` |

### 鉸鏈雙開 × 橫把／推桿

- Source group: 雙門-橫把
- Group: `combo-4c6a3a2d5a6d`
- Skeleton: 鉸鏈雙開
- Accessory: 橫把／推桿
- Parent material: 通風鐵門+田字門+X鐵門
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | b04 | 田字門 | 田字門 | `1-1/b04/b04-s2 田字門.mp4` |

### 鉸鏈雙開 × 門栓鎖

- Source group: 雙門-無把
- Group: `combo-26812ebf9089`
- Skeleton: 鉸鏈雙開
- Accessory: 門栓鎖
- Parent material: 鏽蝕鉚釘鐵門
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | b01 | 鐵門 | 鐵門 | `1-1/b01/b01-s1鐵門.mp4` |

### 中分滑動(雙扇對開) × 自動（無配件）

- Source group: 雙門自動門
- Group: `combo-2683870aa595`
- Skeleton: 中分滑動(雙扇對開)
- Accessory: 自動（無配件）
- Parent material: 鏽蝕金屬平面板+五邊形小窗
- Selected count: 3

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1996 · Biohazard | b07 | 雙門自動門 | 雙門自動門 | `1-1/b07/b07-s1雙門自動門.mp4` |
| 1998 · Biohazard 2 | b07 | 大電梯門 | 大電梯門 | `1-2/b07/b07-s1大電梯門.mp4` |
| 1999 · Biohazard 3 | b06 | 處理廠電梯門 | 處理廠電梯門 | `1-3/b06/b06-s1處理廠電梯門.mp4` |
### 中分滑動(雙扇對開) × 豎把

- Source group: 雙門-纜車門
- Group: `combo-220a6ac32aae`
- Skeleton: 中分滑動(雙扇對開)
- Accessory: 豎把
- Parent material: 金屬+菱格網窗(平面板)
- Selected count: 2

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | b05 | 纜車門1 | 纜車門1 | `1-2/b05/b05-s1纜車門1.mp4` |
| 1998 · Biohazard 2 | b05 | 纜車門2 | 纜車門2 | `1-2/b05/b05-s1纜車門2.mp4` |

### 中分滑動(雙扇對開) × 圓環／轉輪

- Source group: 雙門-列車門
- Group: `combo-ec192427092a`
- Skeleton: 中分滑動(雙扇對開)
- Accessory: 圓環／轉輪
- Parent material: 深色金屬(窗+百葉+旋鈕)
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | b08 | 列車門 | 列車門 | `1-2/b08/b08-s1列車門.mp4` |

### 水平滑動(單扇) × 無配件

- Source group: 單門-列車門
- Group: `combo-c15225885ed6`
- Skeleton: 水平滑動(單扇)
- Accessory: 無配件
- Parent material: 灰金屬(小窗+百葉+橢圓鎖孔面板貼圖)
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | a09 | a09-列車門 | a09-列車門 | `1-2/a09/a09-列車門.mp4` |

### 水平滑動(單扇) × 豎把

- Source group: 輕軌-電車門
- Group: `combo-2a90ff118f81`
- Skeleton: 水平滑動(單扇)
- Accessory: 豎把
- Parent material: 米紅雙色電車門、卡其車廂內門
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1999 · Biohazard 3 | a08 | 電車門 | 電車門 | `1-3/a08/a08-s1電車門.mp4` |

### 水平滑動(單扇) × 橫把／推桿

- Source group: 輕軌-電車門
- Group: `combo-689498409155`
- Skeleton: 水平滑動(單扇)
- Accessory: 橫把／推桿
- Parent material: 米紅雙色電車門、卡其車廂內門
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1999 · Biohazard 3 | a08 | 電車車廂門 | 電車車廂門 | `1-3/a08/a08-s2電車車廂門.mp4` |

### 垂直移動/捲升 × 自動（無配件）

- Source group: 單門-實驗室
- Group: `combo-5f3d5a5baa17`
- Skeleton: 垂直移動/捲升
- Accessory: 自動（無配件）
- Parent material: 灰金屬平板+警示貼紙
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | a10 | 實驗室 | 實驗室 | `1-2/a10/a10-s1實驗室.mp4` |

### 垂直移動/捲升 × 環境操作件

- Source group: 下水道閘門
- Group: `combo-e3b99cba4928`
- Skeleton: 垂直移動/捲升
- Accessory: 環境操作件
- Parent material: 鏽鐵板+梯形齒緣(齒有厚度)
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | b10 | 下水道閘門 | 下水道閘門 | `1-2/b10/b10-s1下水道閘門.mp4` |

### 折疊/摺疊壓縮 × 自動（無配件）

- Source group: 窄雙門-公車門
- Group: `combo-78016d974073`
- Skeleton: 折疊/摺疊壓縮
- Accessory: 自動（無配件）
- Parent material: 金屬窄框+大面玻璃窗
- Selected count: 1

| Source | Code | Door | Material | Asset id |
| --- | --- | --- | --- | --- |
| 1998 · Biohazard 2 | a02 | a02窄雙扇門公車門 | a02窄雙扇門公車門 | `1-2/a02/a02窄雙扇門公車門.mp4` |
