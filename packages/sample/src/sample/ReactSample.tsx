import { useMemo, useRef, useState } from "react";
import {
  DoorEntrance,
  doorAnimationConfigs,
  type DoorAnimationVariant,
  type DoorEntranceHandle,
} from "door-entrance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ReactSample = () => {
  const [variant, setVariant] =
    useState<DoorAnimationVariant>("direct-entry");
  const [status, setStatus] = useState("等待播放");
  const ref = useRef<DoorEntranceHandle>(null);

  const currentLabel = useMemo(
    () => doorAnimationConfigs.find((c) => c.id === variant)?.label ?? "Door",
    [variant]
  );

  const handlePlay = () => {
    setStatus("播放中...");
    ref.current?.reset();
    ref.current?.play();
  };

  return (
    <Card className="border-white/10 bg-white/[0.03] shadow-lg shadow-black/30">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">React sample</Badge>
          <CardTitle className="text-lg font-semibold text-white">
            {currentLabel}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="rounded-full bg-white/10 px-3 py-1">{status}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DoorEntrance
          ref={ref}
          variant={variant}
          autoPlay={false}
          className="h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-black via-slate-900 to-zinc-900"
          onComplete={() => setStatus("播放完成")}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={handlePlay}>
            播放
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => ref.current?.reset()}
          >
            重置
          </Button>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
          <div className="flex flex-col gap-2">
            {doorAnimationConfigs.map((config) => (
              <Button
                key={config.id}
                variant={config.id === variant ? "secondary" : "ghost"}
                size="sm"
                className="justify-start text-sm"
                onClick={() => {
                  setVariant(config.id);
                  setStatus("等待播放");
                }}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReactSample;
