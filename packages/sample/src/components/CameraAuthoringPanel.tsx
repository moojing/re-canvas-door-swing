import { useState } from "react";
import { getDoorEntranceCameraAuthoringInfo, type DoorPhoneFraming, type DoorCameraDraft, type DoorEntrancePreset } from "retro-horror-door";

const CameraAuthoringPanel = ({ preset, draft, phoneFraming, onPhoneChange, onChange, disabled }: {
  preset: DoorEntrancePreset;
  draft: DoorCameraDraft;
  phoneFraming: DoorPhoneFraming;
  onPhoneChange: (framing: DoorPhoneFraming) => void;
  onChange: (draft: DoorCameraDraft) => void;
  disabled: boolean;
}) => {
  const info = getDoorEntranceCameraAuthoringInfo(preset);
  const controls = [
    { key: "initialHeightPercent", label: "開場門高 (%)", value: info.initialHeightPercent, min: 20, max: 200, step: 1,
      supported: info.supportsFraming, reason: "此動畫開場已開門，沒有關門構圖基準。" },
    { key: "approachHeightPercent", label: "靠近後門高 (%)", value: info.approachHeightPercent, min: 20, max: 200, step: 1,
      supported: info.approachHeightPercent !== undefined, reason: "此路徑沒有獨立的靠近結束階段。" },
    { key: "cameraHoldMs", label: "鏡頭停留：增加秒數", value: 0, min: 0, max: 2, step: .1, scale: 1000, supported: true },
    { key: "cameraPace", label: "鏡頭前進速度", value: 1, min: .5, max: 2, step: .1, supported: true },
    { key: "openingWaitMs", label: "開門前等待：增加秒數", value: 0, min: 0, max: 3, step: .1, scale: 1000,
      supported: info.supportsOpeningWait, reason: "此路徑沒有可延長的關門等待階段。" },
  ] as const;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(controls.map(c => {
    const scale = "scale" in c ? c.scale : 1;
    return [c.key, String(Number(((draft[c.key] ?? (c.value ?? 0) * scale) / scale).toFixed(2)))];
  })));
  const phoneControls = [
    { key: "initialHeightPercent", label: "手機開場門高 (%)", inherited: draft.initialHeightPercent ?? info.initialHeightPercent,
      min: 20, max: 200, supported: info.supportsFraming },
    { key: "approachHeightPercent", label: "手機靠近後門高 (%)", inherited: draft.approachHeightPercent ?? info.approachHeightPercent,
      min: 20, max: 200, supported: info.approachHeightPercent !== undefined },
    { key: "offsetXPercent", label: "手機水平偏移 (%)", inherited: 0, min: -50, max: 50, supported: true },
    { key: "offsetYPercent", label: "手機垂直偏移 (%)", inherited: 0, min: -50, max: 50, supported: true },
  ] as const;
  const [phoneValues, setPhoneValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(phoneControls.map(c => [c.key, phoneFraming[c.key] === undefined ? "" : String(phoneFraming[c.key])])));
  const [error, setError] = useState("");
  return (
    <section aria-label="Camera authoring" className="mt-6 space-y-4 border-t border-[#4b3928] pt-6">
      <h2 className="text-sm font-semibold text-[#e9dfcd]">鏡頭校準 · 作者工作台</h2>
      <p className="text-xs leading-5 text-[#aa9f90]">僅調整目前方向，修改暫存在本頁，重新整理即清除。門高以原片比例、裁切前的完整關門投影計算；100% 以上表示裁切。手機預覽可另外覆寫構圖。</p>
      {controls.map(control => (
        <label key={control.key} className="block text-xs text-[#d8c9b5]">
          <span className="block">{control.label}</span>
          <input type="number" aria-label={control.label} min={control.min} max={control.max} step={control.step}
            value={values[control.key]} disabled={disabled || !control.supported}
            onChange={event => {
              const raw = event.target.value;
              setValues(previous => ({ ...previous, [control.key]: raw }));
              try {
                if (raw.trim() === "") throw new Error("請輸入數值，預覽保留最後有效設定。");
                if (!Number.isFinite(Number(raw)) || Number(raw) < control.min || Number(raw) > control.max) {
                  throw new Error(`請輸入 ${control.min}～${control.max}，預覽保留最後有效設定。`);
                }
                onChange({ ...draft, [control.key]: Number(raw) * ("scale" in control ? control.scale : 1) });
                setError("");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "無效設定，預覽保留最後有效設定。");
              }
            }} className="mt-2 min-h-10 w-full border border-[#765939] bg-[#070504] px-3 text-[#f1e7d6] disabled:opacity-40" />
          {!control.supported && "reason" in control && <span className="mt-1 block text-[#aa9f90]">{control.reason}</span>}
        </label>
      ))}
      <fieldset className="space-y-4 border-t border-[#4b3928] pt-4">
        <legend className="text-sm text-[#e9dfcd]">手機構圖覆寫</legend>
        <p className="text-xs leading-5 text-[#aa9f90]">留空沿用共用門高，偏移留空為 0。僅套用預覽短邊 ≤ 600px 的畫面（含橫向）；不影響桌面／平板。門高仍為手機適配前的投影，最終裁切請看 Compare devices。正值向右／向上移動畫面，時序與速度沿用共用設定。</p>
        {phoneControls.map(control => (
          <label key={control.key} className="block text-xs text-[#d8c9b5]">
            <span className="block">{control.label}</span>
            <input type="number" aria-label={control.label} min={control.min} max={control.max} step={1}
              placeholder={control.inherited === undefined ? "不支援" : `沿用 ${control.inherited.toFixed(2)}`}
              value={phoneValues[control.key]} disabled={disabled || !control.supported}
              onChange={event => {
                const raw = event.target.value;
                setPhoneValues(previous => ({ ...previous, [control.key]: raw }));
                try {
                  const next = { ...phoneFraming };
                  if (raw.trim() === "") delete next[control.key];
                  else {
                    const value = Number(raw);
                    if (!Number.isFinite(value) || value < control.min || value > control.max) {
                      throw new Error(`請輸入 ${control.min}～${control.max}，預覽保留最後有效設定。`);
                    }
                    next[control.key] = value;
                  }
                  onPhoneChange(next);
                  setError("");
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "無效設定，預覽保留最後有效設定。");
                }
              }} className="mt-2 min-h-10 w-full border border-[#765939] bg-[#070504] px-3 text-[#f1e7d6] disabled:opacity-40" />
            {!control.supported && <span className="mt-1 block text-[#aa9f90]">此路徑沒有對應的關門構圖基準。</span>}
          </label>
        ))}
      </fieldset>
      <p className="text-xs leading-5 text-[#aa9f90]">鏡頭停留與速度只重新分配鏡頭在既有總時長內的進度，可能改變鏡頭與開門的相對時機。1× 保留原速度分布；大於 1 更早前進，終點不變。開門前等待則延長共同時間軸，連同門板、把手、聲音與淡出一起調整。</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  );
};
export default CameraAuthoringPanel;
