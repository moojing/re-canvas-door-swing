#!/usr/bin/env python3
# 開門動畫視覺圖庫:每門型一張最清楚的門正面 + 點擊放大 modal
# 用法: build_gallery.py [輸出 html 路徑](預設 docs/door-gallery/door-gallery.html)
import base64, glob, html, json, os, re, subprocess, sys, tempfile
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
GALLERY_ROOT = os.path.abspath(os.environ.get(
    "DOOR_GALLERY_ROOT", os.path.join(ROOT, "..", "re-door-gallery")))
MAT = os.path.abspath(os.environ.get(
    "DOOR_VIDEO_ROOT", os.path.join(GALLERY_ROOT, "materials", "door-transitions")))
MD = os.path.join(GALLERY_ROOT, "docs", "door-classifications.md")
SKILL = os.path.join(ROOT, ".claude/skills/check-door/scripts")
TMP = tempfile.mkdtemp(prefix="gallery2-")

# 本地資產輸出(供之後做 local web 用):獨立 still / gif 檔 + doors.json 清單
ASSETS = GALLERY_ROOT
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ASSETS, "index.html")
os.makedirs(os.path.join(ASSETS, "stills"), exist_ok=True)
os.makedirs(os.path.join(ASSETS, "gifs"), exist_ok=True)

GAME_FOLDER = {game: game for game in ("1-1", "1-2", "1-3", "1-4", "1-5")}
GAME_TITLE = {"1-1":"1-1 1996 Biohazard","1-2":"1-2 1998 Biohazard 2",
    "1-3":"1-3 1999 Biohazard 3","1-4":"1-4 2000 Gun Survivor","1-5":"1-5 2000 Code Veronica"}
OPTIMISM_RISK = {("1-1","b05"),("1-2","a04"),("1-3","a09"),("1-3","a10"),("1-5","a04"),
    ("1-2","a11"),("1-2","a08"),("1-5","c08"),("1-3","a11"),("1-5","b01")}

# 手動指定時間點(秒):自動演算法抓不到乾淨主體幀的片段,由目視分鏡挑定。
OVERRIDE = {
    ("1-1","a04"): 1.9, ("1-2","a07"): 3.5, ("1-2","a13"): 3.9, ("1-2","b02"): 4.5,
    ("1-2","b09"): 3.8, ("1-2","c01"): 4.1, ("1-2","c02"): 4.8, ("1-3","a01"): 4.2,
    ("1-3","a04"): 3.5, ("1-3","a05"): 2.9, ("1-3","b02"): 3.1, ("1-3","b03"): 3.2,
    ("1-3","b07"): 2.2, ("1-3","c01"): 4.6, ("1-4","a05"): 4.6, ("1-4","b02"): 3.9,
    ("1-4","c01"): 5.0, ("1-5","a04"): 3.5, ("1-2","a04"): 5.0, ("1-5","c05"): 2.9,
    ("1-5","c08"): 3.7, ("1-2","a14"): 7.5, ("1-2","b05"): 5.6, ("1-2","c06"): 1.0,
    ("1-3","a12"): 4.3, ("1-3","c03"): 1.8, ("1-4","c03"): 6.0,
}
# GIF 時間窗手動指定 (start, dur):門動作離截圖點太遠、自動推導拍不到的片段
GIF_OVERRIDE = {
    ("1-2","c06"): (0.2, 1.7),    # 電梯門只保留前段柵欄拉門,避開後續搭乘段
    ("1-4","c03"): (21.8, 3.6),   # 電梯門到 21.5s 後才開
    ("1-4","c04"): (8.0, 3.6),    # 纜車門 8.5-10.4s 滑開
    ("1-4","c07"): (8.2, 3.2),    # 電車門 9.7-11.5s 滑開(提早起點減少黑尾)
    ("1-4","c08"): (12.0, 4.0),   # 繩索:改沿牆下降段(牆面移動可見,繩本體太細)
}
cur_game = cur_code = None

def parse_md():
    doors, game = [], None
    for line in open(MD, encoding="utf-8"):
        m = re.match(r"^##\s+(1-\d)\s", line)
        if m: game = m.group(1); continue
        if game and re.match(r"^\|\s*[a-d]\d", line):
            c = [x.strip() for x in line.strip().strip("|").split("|")]
            if len(c) < 10: continue
            doors.append(dict(game=game, code=c[0], name=c[1], variants=c[2], form=c[3],
                              mat=c[4], anim=c[5], acc=c[6], csv=c[7], verdict=c[8], note=c[9]))
    return doors

def find_video(game, code):
    for sub in sorted(glob.glob(os.path.join(MAT, GAME_FOLDER[game]) + "/*/")):
        if os.path.basename(sub.rstrip("/")).lower().startswith(code.lower()):
            v = sorted(glob.glob(sub + "/*.mp4"))
            if v: return v[0]
    return None

SW, SH = 64, 40  # 統計用縮圖尺寸

def duration(v):
    o = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",v],
                       capture_output=True, text=True).stdout.strip()
    try: return float(o)
    except Exception: return 0

def frame_stats(v, t):
    # 取 t 秒的影格縮成 64x40 灰階,算:黑佔比、中央亮度、邊緣(上下左右)亮度
    raw = subprocess.run(["ffmpeg","-v","error","-ss",str(t),"-i",v,"-frames:v","1",
                          "-vf",f"scale={SW}:{SH},format=gray","-f","rawvideo","-"],
                         capture_output=True).stdout
    if len(raw) < SW*SH: return None
    black = sum(1 for b in raw if b < 22) / len(raw)
    cs = [raw[y*SW+x] for y in range(9,31) for x in range(23,41)]
    center = sum(cs)/len(cs)
    eL = [raw[y*SW+x] for y in range(SH) for x in range(0,9)]
    eR = [raw[y*SW+x] for y in range(SH) for x in range(SW-9,SW)]
    tB = [raw[y*SW+x] for y in range(0,6) for x in range(SW)]
    bB = [raw[y*SW+x] for y in range(SH-6,SH) for x in range(SW)]
    edge = max((sum(eL)+sum(eR))/(len(eL)+len(eR)), (sum(tB)+sum(bB))/(len(tB)+len(bB)))
    return black, center, edge

def pick_timestamp(v):
    # RE 門/轉場特寫 = 目標主體(門/梯/平台)置中於黑幕,四周近純黑、中央有亮主體。
    # 校準值:門特寫 edge≈0-8、center≈28-60、black≈0.6-0.8;
    #        房間全景 edge>14 center亮;暗走廊 edge低但 center暗、black低。
    # 密集取樣 30 張,分層挑:先要「真正的黑底主體」,漏了才逐層放寬。
    # 純環境依賴(❌)片段無此類幀,最終退而取邊緣最黑的場景幀。
    # 關鍵判別是「邊緣夠黑」:門與細梯的四周皆近純黑,房間全景則邊緣亮。
    # center 下限只用來排除全黑轉場幀(細梯中央也偏暗,故下限放到 12,不能太高)。
    # 合格幀中挑「黑佔比最高」= 主體最完整地置中於黑幕的那張。
    # 手動指定(自動抓不到乾淨主體幀的少數片段,見 OVERRIDE)
    ov = OVERRIDE.get((cur_game, cur_code))
    if ov is not None: return ov
    # 主體(門/梯/平台)置中於黑幕的共同特徵 = 四周邊緣近純黑。
    # center 只排除近全黑幀(細梯中央很暗,故下限放到 6);black<=0.92 擋掉整片全黑。
    # 合格幀中挑「邊緣最黑」= 主體最乾淨地浮在黑幕上。
    D = duration(v)
    if D <= 0: return None
    S = []
    for i in range(36):
        t = D*(i+0.5)/36
        s = frame_stats(v, t)
        if s: S.append((t, s[0], s[1], s[2]))   # (t, black, center, edge)
    if not S: return D*0.4
    valid = [s for s in S if s[2] >= 6 and s[1] <= 0.92]   # 有主體、非整片全黑
    pool = valid if valid else S
    pool.sort(key=lambda s: (s[3], abs(s[2]-30)))          # 邊緣最黑,再中央接近門的亮度
    return pool[0][0]

BRI = "eq=brightness=0.06:contrast=1.12:gamma=1.4"  # 提亮:RE 素材偏暗

def render(game, code):
    # 產生並「存成本地獨立檔」+ 回傳 base64。回傳 (still b64, gif b64, still 相對路徑, gif 相對路徑)
    global cur_game, cur_code
    cur_game, cur_code = game, code
    v = find_video(game, code)
    if not v: return None, None, None, None
    t = pick_timestamp(v)
    if t is None: return None, None, None, None
    D = duration(v)
    key = f"{game}_{code}"
    # 靜態主體特寫(840px 高畫質),直接存進 ASSETS/stills/
    hrel = f"stills/{key}.jpg"
    hdst = os.path.join(ASSETS, hrel)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",str(t),"-i",v,"-frames:v","1",
                    "-vf",f"{BRI},scale=840:-1","-q:v","4",hdst], check=True)
    hero = base64.b64encode(open(hdst,"rb").read()).decode()
    # 開門動畫 GIF:從門特寫略提前 0.3s 起,涵蓋到「段落轉黑處」(門開完、鏡頭穿越後),
    # 這樣能拍到擺動+穿越;找不到就退回固定 3.6s。GIF_OVERRIDE 可整窗手動指定。存進 ASSETS/gifs/
    gov = GIF_OVERRIDE.get((game, code))
    if gov is not None:
        gs, gdur = gov
    else:
        gs = max(0.0, t - 0.3)
        seg_end = None
        tt = t + 0.5
        while tt < D:
            s = frame_stats(v, tt)
            if s and s[1] < 12:          # 轉黑 = 門開完穿越後的黑幕
                seg_end = tt + 0.25
                break
            tt += 0.25
        if seg_end is not None:
            gdur = min(max(seg_end - gs, 1.5), 4.8)   # 夾在 1.5~4.8s
        else:
            gdur = min(3.6, D) if D > 0 else 3.6
    if gs + gdur > D: gs = max(0.0, D - gdur)
    grel = f"gifs/{key}.gif"
    gdst = os.path.join(ASSETS, grel)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",str(gs),"-t",str(gdur),"-i",v,
        "-vf",(f"{BRI},fps=7,scale=200:-1,split[s0][s1];"
               "[s0]palettegen=max_colors=32[p];[s1][p]paletteuse=dither=none"),
        gdst], check=True)
    gif = base64.b64encode(open(gdst,"rb").read()).decode()
    return hero, gif, hrel, grel

def skeleton(form, a):
    if "中分" in a: return "中分滑動(雙扇對開)"
    if "折" in a or "摺" in a: return "折疊/摺疊壓縮"
    if "垂直上" in a or "上滑" in a or "捲升" in a or "垂直上升" in a: return "垂直移動/捲升"
    if "原地旋轉" in a: return "原地旋轉"
    if "水平滑動" in a or ("滑動" in a and "門栓" not in a) or "拉開" in a: return "水平滑動(單扇)"
    if "雙開" in a or "雙扇" in a or "對開" in a: return "鉸鏈雙開"
    if "鉸鏈" in a or "單開" in a or "推門" in a or "前推後拉" in a or "推拉" in a: return "鉸鏈單開"
    if "鏡頭" in a or "非門" in form: return "純鏡頭移動(非門)"
    return "其他/特殊"

# 字串分類的邊角人工校正(逐支目視後判定)
SKELETON_FIX = {
    ("1-2","b03"): "鉸鏈雙開・僅單扇動",   # 雙門僅右扇可動
    ("1-5","b04"): "鉸鏈雙開・僅單扇動",   # 雙門僅單扇拉開
    ("1-1","c03"): "純鏡頭移動(非門)",     # 升降平台(字面「旋轉」誤入原地旋轉)
    ("1-1","d01"): "鉸鏈單開",             # cutscene 門體本身是單開
    ("1-5","c04"): "其他/特殊(剪刀式拉門)",
}

def door_skeleton(d):
    return SKELETON_FIX.get((d["game"], d["code"])) or skeleton(d["form"], d["anim"])

def vclass(v):
    return ("v-no" if "無法製作" in v else "v-opt" if "比評估樂觀" in v
            else "v-warn" if ("需重估" in v or "有出入" in v) else "v-ok")
def vlabel(v):
    return ("❌ 無法製作" if "無法製作" in v else "✅ 比評估樂觀" if "比評估樂觀" in v
            else "⚠️ 需重估" if "需重估" in v else "⚠️ 有出入" if "有出入" in v else "✅ 合理")

doors = parse_md()
print(f"解析 {len(doors)} 門型")
for i, d in enumerate(doors):
    d["b64"], d["gif"], d["still_path"], d["gif_path"] = render(d["game"], d["code"])
    if not d["b64"]: print("  無縮圖:", d["game"], d["code"])
    if (i+1) % 20 == 0: print(f"  …{i+1}/{len(doors)}")
cnt = Counter(vlabel(d["verdict"]) for d in doors)
risk_count = sum(1 for d in doors if (d["game"], d["code"]) in OPTIMISM_RISK)
csvno_count = sum(1 for d in doors if "❌" in d["csv"])

# 寫出 doors.json 清單(供 local web 用):每門型的分類資料 + 本地資產相對路徑
manifest = [{
    "game": d["game"], "code": d["code"], "name": d["name"], "variants": d["variants"],
    "form": d["form"], "material": d["mat"], "animation": d["anim"], "accessory": d["acc"],
    "skeleton": door_skeleton(d),                      # 動畫骨架區塊(統計用,已含人工校正)
    "csv": d["csv"], "csv_excluded": "❌" in d["csv"],  # 原評估標 ❌ = 照原計畫不會製作
    "verdict": vlabel(d["verdict"]),
    "verdict_class": vclass(d["verdict"]), "note": d["note"],
    "optimism_risk": (d["game"], d["code"]) in OPTIMISM_RISK,
    "still": d.get("still_path"), "gif": d.get("gif_path"),
} for d in doors]
with open(os.path.join(ASSETS, "doors.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f"本地資產寫入 {ASSETS}(stills/ gifs/ doors.json),組 HTML…")

idx_of = {(d["game"], d["code"]): di for di, d in enumerate(doors)}

cards = []
for di, d in enumerate(doors):
    risk = (d["game"], d["code"]) in OPTIMISM_RISK
    excl = "❌" in d["csv"]
    vc = vclass(d["verdict"])
    filt = vc + (" risk" if risk else "") + (" csvno" if excl else "")
    img = (f'<img class="thumb" data-idx="{di}" alt="{d["game"]} {d["code"]} {html.escape(d["name"])}">'
           if d["b64"] else '<div class="noimg">（無縮圖）</div>')
    rb = '<span class="risk-badge">⚠ 待驗證</span>' if risk else ''
    excl_badge = '<span class="badge b-csvno">🚫 CSV 不製作</span>' if excl else ''
    cards.append(f'''<figure class="card {filt}" data-game="{d['game']}" data-idx="{di}">
  <div class="imgwrap">{img}<span class="zoom">⤢</span></div>
  <figcaption class="body">
    <div class="hd"><span class="code">{d['game']} {html.escape(d['code'])}</span>
      <span class="badges">{excl_badge}<span class="badge {vc}">{vlabel(d['verdict'])}</span></span></div>
    <div class="name">{html.escape(d['name'])} {rb}<span class="var">×{html.escape(d['variants'])}</span></div>
    <div class="axes">
      <span><b>形</b>{html.escape(d['form'])}</span>
      <span><b>材</b>{html.escape(d['mat'])}</span>
      <span><b>動</b>{html.escape(d['anim'])}</span>
      <span><b>配</b>{html.escape(d['acc'])}</span></div>
    <div class="csv"><b>CSV</b> {html.escape(d['csv'])}</div>
    <div class="note">{html.escape(d['note'])}</div>
  </figcaption>
</figure>''')

sections = []
for g in ["1-1","1-2","1-3","1-4","1-5"]:
    gc = [c for c,d in zip(cards, doors) if d["game"]==g]
    sections.append(f'<h2 id="g{g}">{html.escape(GAME_TITLE[g])} <span class="gcount">{len(gc)} 門型</span></h2>\n<div class="grid">{"".join(gc)}</div>')

# ===== 分析視角 =====
def form_bucket(form):
    for k in ("非門","大扇門","雙門","單門"):
        if k in form: return "非門轉場" if k=="非門" else k
    return "其他"

def chip(di, note_key=None):
    d = doors[di]
    note = ""
    if note_key:
        note = f'<span class="cnote">{html.escape(d[note_key])}</span>'
    return (f'<button class="athumb" data-idx="{di}">'
            f'<img data-idx="{di}" alt="{d["game"]} {d["code"]}">'
            f'<span class="acode">{d["game"]} {html.escape(d["code"])} '
            f'<i>{html.escape(d["name"])}</i></span>{note}</button>')

def chip_row(dlist, note_key=None):
    return '<div class="agrid">' + "".join(chip(di, note_key) for di in dlist) + '</div>'

# B. 原評估可做/嚴重低估(★ 人工挑選,附理由)
HL = [
    ("1-2","c04","原列 4h 可做 → 應歸零","轉場本體是鏡頭在風管內滑行,環境即動畫,無可獨立的門件。"),
    ("1-4","c08","原列 3h 可做 → 應歸零","第一人稱沿繩垂降,無任何門板,鏡頭運動完全依賴環境。"),
    ("1-1","b06","5/8h → 8h 低估","開門是剪刀式摺疊壓縮(柵條間距連續變化),需骨架/程式逐件控制,另有搭乘段。"),
    ("1-5","c04","8h → 主體不可做","影片主體是鐵網籠沿桁架下降的搭乘段;真正拉門只在結尾極暗畫面短暫出現。"),
    ("1-3","b01","5/6h → 6h 不足","s1 警局大門是鏤空柵欄(需建欄杆幾何),與 s2 平面貼圖不同款,應按兩款門分開計。"),
]
hl_html = ""
for g,c,tag,why in HL:
    di = idx_of.get((g,c))
    if di is None: continue
    hl_html += (f'<div class="hl"><button class="athumb big" data-idx="{di}">'
                f'<img data-idx="{di}" alt="{g} {c}"></button>'
                f'<div class="hlbody"><div class="hlhd">{g} {html.escape(c)} '
                f'{html.escape(doors[di]["name"])} <span class="hltag">{html.escape(tag)}</span></div>'
                f'<div class="hlwhy">{html.escape(why)}</div></div></div>')

opt_ids  = [di for di,d in enumerate(doors) if vclass(d["verdict"])=="v-opt"]
no_ids   = [di for di,d in enumerate(doors) if vclass(d["verdict"])=="v-no"]
warn_ids = [di for di,d in enumerate(doors) if vclass(d["verdict"])=="v-warn"]
risk_ids = [di for di,d in enumerate(doors) if (d["game"],d["code"]) in OPTIMISM_RISK]
excl_ids = [di for di,d in enumerate(doors) if "❌" in d["csv"]]

# F. 動畫分類階層:形式 → 骨架(只收可製作門型)
FORM_ORDER = ["單門","雙門","大扇門","非門轉場","其他"]
hier = {}
for di,d in enumerate(doors):
    if vclass(d["verdict"])=="v-no": continue
    fb = form_bucket(d["form"]); sk = door_skeleton(d)
    hier.setdefault(fb, {}).setdefault(sk, []).append(di)
hier_html = ""
for fb in FORM_ORDER:
    if fb not in hier: continue
    total = sum(len(v) for v in hier[fb].values())
    hier_html += f'<div class="hform">{fb} <span class="hc">{total} 門型</span></div>'
    for sk, dl in sorted(hier[fb].items(), key=lambda kv:-len(kv[1])):
        hier_html += (f'<div class="hrow"><div class="hsk">{html.escape(sk)}'
                      f' <span class="hc">×{len(dl)}</span></div>{chip_row(dl)}</div>')

analysis_html = f'''
<div class="astat">
  <div class="abox"><b>{len(doors)}</b><span>門型</span></div>
  <div class="abox ok"><b>{cnt.get('✅ 合理',0)}</b><span>評估合理</span></div>
  <div class="abox opt"><b>{len(opt_ids)}</b><span>可救回(原❌)</span></div>
  <div class="abox warn"><b>{len(warn_ids)}</b><span>有出入/需重估</span></div>
  <div class="abox no"><b>{len(no_ids)}</b><span>無法製作</span></div>
  <div class="abox no"><b>{len(excl_ids)}</b><span>🚫 CSV 不製作(❌)</span></div>
  <div class="abox risk"><b>{len(risk_ids)}</b><span>樂觀待驗證</span></div>
</div>
<p class="atake">原 CSV 估 130h,但那已是「非❌」的既有範圍。實看後:22 個原標 ❌ 的門其實可做(平面貼圖/基本幾何可仿製,約可救回 60–85h);2 個原列工時的項目其實依賴環境做不了(應扣約 7h);另有電梯搭乘類嚴重低估。動畫骨架其實只有約 4 套,成本集中在配件模型與貼圖變體數。</p>

<h3 class="asec">① 原評估可做 / 嚴重低估 <span class="asub">★ 最需注意</span></h3>
<div class="hlwrap">{hl_html}</div>

<h3 class="asec">② 可救回:原標 ❌、實際可做 <span class="asub">{len(opt_ids)} 項</span></h3>
<p class="adesc">共通鑰匙:鏤空件用 alpha 透明貼圖貼平面即可仿製。滑動門無風險;旋轉門側面透視會露餡(見「樂觀待驗證」)。</p>
{chip_row(opt_ids, "note")}

<h3 class="asec">③ 無法製作:動畫依賴環境、拆不出獨立主體 <span class="asub">{len(no_ids)} 項</span></h3>
<p class="adesc">「載具門連環境一起做」不成立——電梯搭乘、纜車、繩索、貨梯等,拆掉環境後沒有可獨立的門動畫。部分「僅門體」可低成本另議。</p>
{chip_row(no_ids, "note")}

<h3 class="asec">④ 有出入 / 需重估 <span class="asub">{len(warn_ids)} 項</span></h3>
{chip_row(warn_ids, "note")}

<h3 class="asec">⑤ 樂觀待驗證:我自認最沒把握的判定 <span class="asub">{len(risk_ids)} 項</span></h3>
<p class="adesc">alpha 平面貼圖套在「旋轉門」上側面會露餡;部分把手是否有獨立解鎖動畫,影格看不出來。這些先別算進可交付時數。</p>
{chip_row(risk_ids)}

<h3 class="asec">⑥ 動畫分類階層(形式 › 動畫骨架)</h3>
<p class="adesc">只收可製作門型。可看出「一套動畫骨架 + 換貼圖配件」能覆蓋多少門——多樣性極低,主力就是鉸鏈單/雙開。</p>
{hier_html}

<h3 class="asec">⑦ 最小實作組合 & 100h 預算</h3>
<div class="prose">
<p><b>4 套骨架覆蓋絕大多數:</b>① 鉸鏈單開 + ② 鉸鏈雙開(你們單門版已完成,雙門只是加一片鏡像門)→ 涵蓋所有 a/b 一般門(6 成以上);③ 水平滑動 + 中分滑動 → 拉門/自動門/電梯門;④ 純鏡頭移動 → 全部階梯/直梯/升降平台/鑽洞。少數特例:雙門單扇開、垂直上升/捲升、窄雙板折疊。</p>
<p><b>配件才是要逐一備的資產:</b>無把 / 喇叭鎖 / 豎把 / 橫把 / 彎把 / 斜把 / 圓環 / 門栓 / 轉盤鎖 / 自動,約 10 種。這 10 種把手 + 4 套骨架 + 逐門平面貼圖即可組出全部可做門型。</p>
<p><b>守住 100h 的關鍵:</b>現有「非❌」範圍本身已約 130h。要壓到 100h 需:砍掉電梯搭乘/環境依賴的低價值項(約 30h)、22 個救回項留作選配不進承諾、並用 pool 做法限制每門型只做 3–5 個代表貼圖(而非重現 300+ 變體——貼圖量才是真正會爆的地方)。</p>
</div>
'''

style = """<style>
:root{--bg:#0e1014;--card:#181b21;--line:#282d38;--tx:#e8eaee;--dim:#989ea9;
--ok:#3fb950;--opt:#589bff;--warn:#d6a021;--no:#f0564d;--risk:#e06aa8;}
*{box-sizing:border-box}
html,body{background:#0e1014;margin:0}
.wrap{max-width:1500px;margin:0 auto;padding:10px 6px 70px;color:var(--tx);background:#0e1014;
font-family:-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.5}
h1{font-size:22px;margin:.2em 0;letter-spacing:.01em}
.lead{color:#b6bcc6;font-size:13px;margin-bottom:14px;max-width:70ch}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 12px;font-size:13px}
.stat b{font-size:16px;font-variant-numeric:tabular-nums}
.filters{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0;
border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px}
.fbtn{background:var(--card);border:1px solid var(--line);color:var(--tx);
border-radius:20px;padding:5px 14px;font-size:13px;cursor:pointer}
.fbtn:hover{border-color:var(--dim)}
.fbtn.on{background:var(--tx);color:#000;font-weight:600;border-color:var(--tx)}
h2{font-size:17px;border-left:4px solid var(--opt);padding-left:9px;margin:28px 0 14px}
.gcount{color:var(--dim);font-size:13px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:0;display:flex;flex-direction:column}
.imgwrap{position:relative;cursor:zoom-in;background:#000;aspect-ratio:16/10}
.thumb{width:100%;height:100%;display:block;object-fit:contain}
.zoom{position:absolute;top:7px;right:8px;background:rgba(0,0,0,.55);color:#fff;
font-size:13px;padding:2px 7px;border-radius:5px;opacity:0;transition:opacity .15s}
.imgwrap:hover .zoom{opacity:1}
.noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--dim)}
.body{padding:9px 11px 11px}
.hd{display:flex;justify-content:space-between;align-items:center;gap:6px}
.code{font-weight:700;font-size:14px;font-variant-numeric:tabular-nums}
.badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.badge{font-size:11px;padding:2px 7px;border-radius:5px;white-space:nowrap}
.b-csvno{background:rgba(240,86,77,.22);color:#ff9c96;border:1px dashed rgba(240,86,77,.6);font-weight:600}
.v-ok{background:rgba(63,185,80,.15);color:var(--ok);border:1px solid rgba(63,185,80,.4)}
.v-opt{background:rgba(88,155,255,.15);color:var(--opt);border:1px solid rgba(88,155,255,.4)}
.v-warn{background:rgba(214,160,33,.15);color:var(--warn);border:1px solid rgba(214,160,33,.4)}
.v-no{background:rgba(240,86,77,.15);color:var(--no);border:1px solid rgba(240,86,77,.4)}
.name{font-size:13.5px;margin:7px 0;color:#eef0f4}
.var{color:var(--dim);font-size:12px;margin-left:4px}
.risk-badge{background:rgba(224,106,168,.22);color:#f090c4;border:1px solid rgba(224,106,168,.55);
font-size:10px;padding:1px 5px;border-radius:4px;margin-left:4px}
.axes{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:#d7dce4;margin:8px 0}
.axes span{display:flex;gap:6px;align-items:baseline}
.axes b{flex:none;color:#8fbcff;font-weight:700;background:rgba(88,155,255,.14);
border-radius:4px;padding:0 5px;font-size:11px;line-height:1.7}
.csv{font-size:12.5px;color:#c4cad3;margin:6px 0}.csv b{color:#e6b83e;margin-right:4px}
.note{font-size:12.5px;color:#d3d8e0;border-top:1px dashed var(--line);padding-top:7px;margin-top:7px}
.card.hide{display:none}
#modal{position:fixed;inset:0;background:rgba(0,0,0,.94);display:none;z-index:50;
overflow-y:auto;padding:28px 20px 48px;cursor:zoom-out}
#modal.on{display:block}
#mbox{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:default}
#mbox img{max-width:100%;object-fit:contain;border:1px solid var(--line);border-radius:6px;background:#000}
#mgif{width:440px;max-width:100%;image-rendering:auto}
#mimg{max-height:60vh}
#mcap{color:var(--tx);font-size:16px;text-align:center;margin-bottom:4px}
#mcap .mc{font-weight:700;margin-right:8px;color:var(--opt)}
.msec{color:var(--dim);font-size:12px;letter-spacing:.05em;align-self:flex-start;margin-top:8px}
#mclose{position:fixed;top:14px;right:20px;color:#fff;font-size:30px;cursor:pointer;line-height:1;z-index:2}
/* 分頁 */
.tabs{display:flex;gap:8px;margin:6px 0 18px;border-bottom:1px solid var(--line);padding-bottom:0}
.tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--dim);
font-size:15px;padding:8px 14px;cursor:pointer;margin-bottom:-1px}
.tab:hover{color:var(--tx)}
.tab.on{color:var(--tx);border-bottom-color:var(--opt);font-weight:600}
/* 分析視角 */
#view-analysis{max-width:1120px}
.astat{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 14px}
.abox{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 16px;min-width:96px}
.abox b{display:block;font-size:24px;font-variant-numeric:tabular-nums}
.abox span{font-size:12px;color:var(--dim)}
.abox.ok b{color:var(--ok)}.abox.opt b{color:var(--opt)}.abox.warn b{color:var(--warn)}
.abox.no b{color:var(--no)}.abox.risk b{color:var(--risk)}
.atake{color:#cfd4dc;font-size:13.5px;max-width:80ch;margin:6px 0 20px;line-height:1.7}
.asec{font-size:16px;margin:30px 0 6px;color:var(--tx);border-left:4px solid var(--opt);padding-left:9px}
.asec .asub{font-size:12px;color:var(--dim);font-weight:400;margin-left:6px}
.adesc{color:var(--dim);font-size:12.5px;max-width:82ch;margin:2px 0 12px;line-height:1.6}
.agrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:8px}
.athumb{background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden;
cursor:zoom-in;padding:0;text-align:left;display:flex;flex-direction:column;color:var(--tx)}
.athumb:hover{border-color:var(--opt)}
.athumb img{width:100%;aspect-ratio:16/10;object-fit:contain;background:#000;display:block}
.acode{font-size:12px;font-weight:700;padding:5px 8px 2px}
.acode i{font-weight:400;color:var(--dim);font-style:normal}
.cnote{font-size:11.5px;color:#c3c8d0;padding:0 8px 7px;line-height:1.45}
/* 高亮卡(原評估可做/低估) */
.hlwrap{display:flex;flex-direction:column;gap:10px;margin-bottom:8px}
.hl{display:flex;gap:12px;background:var(--card);border:1px solid rgba(240,86,77,.35);border-radius:10px;padding:10px}
.hl .athumb{flex:none;width:190px;border-color:var(--line)}
.hl.big img,.athumb.big img{aspect-ratio:16/10}
.hlbody{flex:1;min-width:0}
.hlhd{font-size:14px;font-weight:700;margin-bottom:4px}
.hltag{font-size:11px;color:var(--no);background:rgba(240,86,77,.14);border:1px solid rgba(240,86,77,.4);
border-radius:4px;padding:1px 6px;margin-left:6px;font-weight:600;white-space:nowrap}
.hlwhy{font-size:12.5px;color:#cfd4dc;line-height:1.6}
/* 分類階層 */
.hform{font-size:15px;font-weight:700;margin:20px 0 8px;color:#eef0f4}
.hform .hc,.hsk .hc{color:var(--dim);font-size:12px;font-weight:400}
.hrow{border-left:2px solid var(--line);padding-left:12px;margin:0 0 14px}
.hsk{font-size:13px;color:#8fbcff;margin:6px 0 6px}
.prose p{color:#cfd4dc;font-size:13px;line-height:1.75;max-width:84ch;margin:8px 0}
.prose b{color:#eef0f4}
</style>"""

hero_js = "const HERO=[" + ",".join(
    (f'"data:image/jpeg;base64,{d["b64"]}"' if d.get("b64") else "null") for d in doors) + "];"
anim_js = "const ANIM=[" + ",".join(
    (f'"data:image/gif;base64,{d["gif"]}"' if d.get("gif") else "null") for d in doors) + "];"
# "<" 逸出為 <:Markdown 來的 name 不得含 "</script>" 之類序列終止腳本區塊
meta_js = ("const META=[" + ",".join(
    (json.dumps({"c": d["game"]+" "+d["code"], "n": d["name"]}, ensure_ascii=False)) for d in doors) + "];"
    ).replace("<", "\\u003c")

script = "<script>\n" + hero_js + "\n" + anim_js + "\n" + meta_js + "\n" + """
// 所有縮圖(卡片 + 分析 chip)共用 HERO[],載入時依 data-idx 設 src(避免重複嵌入)
addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('img[data-idx]').forEach(im=>{
    const h=HERO[+im.dataset.idx]; if(h) im.src=h;
  });
});
const modal=document.getElementById('modal'),mimg=document.getElementById('mimg'),
      mgif=document.getElementById('mgif'),mgifsec=document.getElementById('mgifsec'),
      mcap=document.getElementById('mcap');
function openModal(idx){
  const g=ANIM[idx];
  if(g){mgif.src=g;mgif.style.display='';mgifsec.style.display='';}
  else{mgif.style.display='none';mgifsec.style.display='none';}
  mimg.src=HERO[idx]||'';
  // 以 textContent 組 caption,避免分類資料被當 HTML 解析
  mcap.textContent='';
  const mc=document.createElement('span'); mc.className='mc'; mc.textContent=META[idx].c;
  mcap.appendChild(mc); mcap.append(META[idx].n);
  modal.scrollTop=0; modal.classList.add('on');
}
document.querySelectorAll('.card .imgwrap').forEach(w=>{
  w.addEventListener('click',()=>openModal(+w.closest('.card').dataset.idx));
});
document.querySelectorAll('.athumb').forEach(b=>{
  b.addEventListener('click',()=>openModal(+b.dataset.idx));
});
function closeM(){modal.classList.remove('on');mimg.src='';mgif.src='';}
modal.addEventListener('click',e=>{if(e.target.tagName!=='IMG')closeM();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeM();});
// 分頁切換
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');
  const v=t.dataset.v;
  document.getElementById('view-gallery').style.display=(v==='gallery')?'':'none';
  document.getElementById('view-analysis').style.display=(v==='analysis')?'':'none';
  scrollTo(0,0);
});
// 圖庫篩選
document.querySelectorAll('.fbtn').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.fbtn').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  const f=b.dataset.f;
  document.querySelectorAll('.card').forEach(c=>c.classList.toggle('hide',f!=='all'&&!c.classList.contains(f)));
  document.querySelectorAll('#view-gallery h2').forEach(h=>{const n=h.nextElementSibling;
    h.style.display=[...n.children].some(c=>!c.classList.contains('hide'))?'':'none';});
});
</script>"""

body = f"""<div class="wrap" translate="no">
<h1>🚪 開門動畫 — 分類圖庫 & 可行性分析</h1>
<div class="lead">113 門型逐支影片檢查(2026-07-05~07)。<b>圖庫</b>逐門瀏覽(點圖看開門 GIF + 放大特寫);<b>分析</b>是決策視角(可救回/無法製作/分類階層/100h 預算),每項都可點圖。</div>
<div class="tabs">
  <button class="tab on" data-v="gallery">🖼️ 圖庫</button>
  <button class="tab" data-v="analysis">📊 分析</button>
</div>

<div id="view-gallery">
<div class="filters">
  <button class="fbtn on" data-f="all">全部 ({len(doors)})</button>
  <button class="fbtn" data-f="v-ok">✅ 合理 ({cnt['✅ 合理']})</button>
  <button class="fbtn" data-f="v-opt">✅ 比評估樂觀 ({cnt['✅ 比評估樂觀']})</button>
  <button class="fbtn" data-f="v-warn">⚠️ 有出入/需重估 ({cnt['⚠️ 有出入'] + cnt['⚠️ 需重估']})</button>
  <button class="fbtn" data-f="v-no">❌ 無法製作 ({cnt['❌ 無法製作']})</button>
  <button class="fbtn" data-f="risk">⚠ 樂觀待驗證 ({risk_count})</button>
  <button class="fbtn" data-f="csvno">🚫 CSV 不製作 ({csvno_count})</button>
</div>
{"".join(sections)}
</div>

<div id="view-analysis" style="display:none">
{analysis_html}
</div>
</div>
<div id="modal"><span id="mclose">✕</span>
  <div id="mbox">
    <div id="mcap"></div>
    <div class="msec" id="mgifsec">▶ 開門動畫</div>
    <img id="mgif" alt="開門動畫">
    <div class="msec">主體特寫（靜態放大）</div>
    <img id="mimg" alt="主體放大">
  </div>
</div>
{script}"""

doc = f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>開門動畫 — 分類圖庫 & 可行性分析</title>
{style}
</head>
<body>
{body}
</body>
</html>
"""

open(OUT,"w",encoding="utf-8").write(doc)
print("寫出:", OUT, f"({os.path.getsize(OUT)//1024} KB)")
