import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  mountDoorEntrance,
  type DoorEntranceHandle,
  type DoorEntrancePresetId,
} from "retro-horror-door";

export type FullScreenDoorTransitionRequest = {
  preset: DoorEntrancePresetId;
  destination: string;
};

export type FullScreenDoorTransitionHandle = {
  play: (request: FullScreenDoorTransitionRequest) => void;
};

type FullScreenDoorTransitionProps = {
  onActiveChange: (active: boolean) => void;
  onComplete: (request: FullScreenDoorTransitionRequest) => void;
};

const FullScreenDoorTransition = forwardRef<
  FullScreenDoorTransitionHandle,
  FullScreenDoorTransitionProps
>(({ onActiveChange, onComplete }, ref) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<DoorEntranceHandle | null>(null);
  const requestRef = useRef<FullScreenDoorTransitionRequest | null>(null);
  const runningRef = useRef(false);
  const completedRef = useRef(false);
  const onActiveChangeRef = useRef(onActiveChange);
  const onCompleteRef = useRef(onComplete);
  const [active, setActive] = useState(false);

  onActiveChangeRef.current = onActiveChange;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const door = mountDoorEntrance({
      target,
      preset: "biohazard-1996-a01-iron-door",
      autoPlay: false,
      className: "h-full w-full border-0 bg-black",
      onComplete: () => {
        const request = requestRef.current;
        if (!runningRef.current || completedRef.current || !request) return;

        completedRef.current = true;
        runningRef.current = false;
        onActiveChangeRef.current(false);
        setActive(false);
        onCompleteRef.current(request);
      },
    });
    doorRef.current = door;

    return () => {
      door.unmount();
      doorRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (active) regionRef.current?.focus();
  }, [active]);

  useImperativeHandle(
    ref,
    () => ({
      play: (request) => {
        const door = doorRef.current;
        if (!door || runningRef.current) return;

        runningRef.current = true;
        completedRef.current = false;
        requestRef.current = request;
        onActiveChangeRef.current(true);
        setActive(true);
        door.reset(request.preset);
        door.play(request.preset);
      },
    }),
    []
  );

  return (
    <div
      ref={regionRef}
      role="status"
      aria-label="Page transition in progress"
      aria-live="polite"
      aria-hidden={active ? undefined : true}
      tabIndex={-1}
      className={`fixed inset-0 z-[100] bg-black transition-opacity duration-150 ${
        active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div ref={targetRef} className="absolute inset-0" />
    </div>
  );
});

FullScreenDoorTransition.displayName = "FullScreenDoorTransition";

export default FullScreenDoorTransition;
