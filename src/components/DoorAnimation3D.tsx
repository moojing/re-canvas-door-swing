import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import {
  doorAnimationConfigs,
  DoorAnimationConfig,
  DoorAnimationState,
  easeInOutCubic,
} from "@/lib/doorAnimationConfigs";

const DEFAULT_CONFIG = doorAnimationConfigs[0];
const DEFAULT_STATE = DEFAULT_CONFIG.getState(0);

interface DoorProps {
  doorAngle: number;
}

const Door = ({ doorAngle }: DoorProps) => {
  const doorGroupRef = useRef<THREE.Group>(null);
  const doorPlaneRef = useRef<THREE.Mesh>(null);
  
  // 加載紋理圖片
  const doorTexture = useLoader(THREE.TextureLoader, '/textures/door-1.png');
  
  // 設置紋理不重複，拉伸填滿整個面
  useEffect(() => {
    if (doorTexture) {
      doorTexture.wrapS = doorTexture.wrapT = THREE.ClampToEdgeWrapping;
      doorTexture.repeat.set(1, 1);
      doorTexture.offset.set(0, 0);
      doorTexture.flipY = false;
      doorTexture.needsUpdate = true;
    }
  }, [doorTexture]);

  useFrame(() => {
    if (doorGroupRef.current) {
      // 單門向外開啟（走進去的視角）
      doorGroupRef.current.rotation.y = -doorAngle * Math.PI / 2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 門框 */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[3.2, 6.2, 0.2]} />
        <meshLambertMaterial color="#2d2520" />
      </mesh>
      
      {/* 門框內側 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 6, 0.1]} />
        <meshLambertMaterial color="#1a1510" />
      </mesh>

      {/* 單門組 - 以左側為軸心旋轉 */}
      <group ref={doorGroupRef} position={[-1.5, 0, 0]}>
        {/* 門主體 */}
        <mesh position={[1.5, 0, 0.08]}>
          <boxGeometry args={[3, 6, 0.15]} />
          <meshLambertMaterial 
            color="#8B4513"
          />
        </mesh>
        
        {/* 門正面紋理覆蓋層 - 覆蓋整個門面 */}
        <mesh ref={doorPlaneRef} position={[1.5, 0, 0.16]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial 
            map={doorTexture}
            transparent={false}
          />
        </mesh>
        
        
        {/* 門把手 */}
        <mesh position={[2.4, 0, 0.2]}>
          <sphereGeometry args={[0.08]} />
          <meshLambertMaterial color="#78643c" />
        </mesh>
      </group>
    </group>
  );
};

const CameraController = ({
  cameraPosition,
  cameraTarget,
  fadeOut,
  onAnimationComplete,
}: {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fadeOut: number;
  onAnimationComplete?: () => void;
}) => {
  const { camera } = useThree();
  const fadeRef = useRef<THREE.Mesh>(null);
  const positionRef = useRef(cameraPosition);
  const targetRef = useRef(cameraTarget);
  const fadeValueRef = useRef(fadeOut);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    positionRef.current = cameraPosition;
  }, [cameraPosition]);

  useEffect(() => {
    targetRef.current = cameraTarget;
  }, [cameraTarget]);

  useEffect(() => {
    fadeValueRef.current = fadeOut;
    if (fadeOut < 0.99) {
      hasCompletedRef.current = false;
    }
  }, [fadeOut]);

  useFrame(() => {
    const [x, y, z] = positionRef.current;
    camera.position.set(x, y, z);

    const [tx, ty, tz] = targetRef.current;
    camera.lookAt(tx, ty, tz);
    
    // 控制淡出效果
    if (fadeRef.current) {
      const material = fadeRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = fadeValueRef.current;
      
      // 當完全淡出時觸發動畫完成
      if (fadeValueRef.current >= 0.99 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          onAnimationComplete?.();
        }, 500);
      }
    }
  });

  return (
    <>
      {/* 淡出遮罩 */}
      <mesh ref={fadeRef} position={[0, 0, 5]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0} />
      </mesh>
    </>
  );
};

const Scene = ({ 
  doorAngle, 
  cameraPosition,
  cameraTarget,
  fadeOut, 
  onAnimationComplete 
}: { 
  doorAngle: number; 
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fadeOut: number;
  onAnimationComplete?: () => void;
}) => {
  return (
    <>
      {/* 環境光 */}
      <ambientLight intensity={0.3} />
      
      {/* 主光源 */}
      <directionalLight position={[2, 5, 5]} intensity={0.8} />
      
      {/* 暖色調光源（營造恐怖氛圍）*/}
      <pointLight position={[0, 2, 3]} intensity={0.5} color="#ff8844" />
      
      {/* 門組件 */}
      <Door doorAngle={doorAngle} />
      
      {/* 攝像機控制器 */}
      <CameraController 
        cameraPosition={cameraPosition}
        cameraTarget={cameraTarget}
        fadeOut={fadeOut}
        onAnimationComplete={onAnimationComplete}
      />
    </>
  );
};

interface DoorAnimation3DProps {
  onComplete?: () => void;
}

const DoorAnimation3D = ({ onComplete }: DoorAnimation3DProps) => {
  const [selectedConfigId, setSelectedConfigId] = useState(DEFAULT_CONFIG.id);
  const selectedConfig =
    doorAnimationConfigs.find((config) => config.id === selectedConfigId) ??
    DEFAULT_CONFIG;

  const [isAnimating, setIsAnimating] = useState(false);
  const [doorAngle, setDoorAngle] = useState(DEFAULT_STATE.doorAngle);
  const [cameraPosition, setCameraPosition] = useState(
    DEFAULT_STATE.cameraPosition
  );
  const [cameraTarget, setCameraTarget] = useState(DEFAULT_STATE.cameraTarget);
  const [fadeOut, setFadeOut] = useState(DEFAULT_STATE.fadeOut);
  const [currentMarker, setCurrentMarker] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  const applyState = useCallback((state: DoorAnimationState) => {
    setDoorAngle(state.doorAngle);
    setCameraPosition(state.cameraPosition);
    setCameraTarget(state.cameraTarget);
    setFadeOut(state.fadeOut);
  }, []);

  const cancelAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const resetToInitialState = useCallback((config: DoorAnimationConfig) => {
    cancelAnimationLoop();
    const initialState = config.getState(0);
    applyState(initialState);
    setCurrentMarker(0);
    setIsAnimating(false);
  }, [applyState, cancelAnimationLoop]);

  useEffect(() => {
    resetToInitialState(selectedConfig);
  }, [selectedConfig, resetToInitialState]);

  useEffect(() => () => cancelAnimationLoop(), [cancelAnimationLoop]);

  const startAnimation = () => {
    if (isAnimating) return;

    const config = selectedConfig;
    const duration = config.duration;
    const easing = config.easing ?? easeInOutCubic;
    const markers = config.progressMarkers;
    const configId = config.id;

    setIsAnimating(true);
    setCurrentMarker(0);

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const linearProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(linearProgress);

      const state = config.getState(easedProgress);
      applyState(state);

      if (markers.length > 0) {
        const activeMarker = markers.reduce((acc, marker, index) => {
          return easedProgress + 1e-4 >= marker ? index : acc;
        }, 0);
        setCurrentMarker(activeMarker);
      }

      if (linearProgress < 1 && selectedConfigId === configId) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        if (markers.length > 0) {
          setCurrentMarker(markers.length - 1);
        }
        animationFrameRef.current = null;
      }
    };

    cancelAnimationLoop();
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const resetAnimation = () => {
    resetToInitialState(selectedConfig);
  };

  const handleAnimationComplete = () => {
    onComplete?.();
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Three.js Canvas with error handling */}
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 60 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000');
        }}
      >
        <Scene 
          doorAngle={doorAngle}
          cameraPosition={cameraPosition}
          cameraTarget={cameraTarget}
          fadeOut={fadeOut}
          onAnimationComplete={handleAnimationComplete}
        />
      </Canvas>

      {/* 動畫選擇 */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 items-center z-10">
        <span className="text-sm text-muted-foreground tracking-wide">
          選擇開門動畫
        </span>
        <div className="flex gap-3">
          {doorAnimationConfigs.map((config) => {
            const isSelected = config.id === selectedConfig.id;
            return (
              <Button
                key={config.id}
                onClick={() => {
                  if (!isAnimating) {
                    setSelectedConfigId(config.id);
                  }
                }}
                disabled={isAnimating}
                variant={isSelected ? "secondary" : "ghost"}
                size="lg"
                className={`backdrop-blur-sm transition-all ${
                  isSelected
                    ? "shadow-lg shadow-secondary/40"
                    : "bg-background/60 hover:bg-background/80"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex flex-col text-left">
                  <span className="text-base font-semibold">
                    {config.label}
                  </span>
                  {config.description && (
                    <span className="text-xs text-muted-foreground">
                      {config.description}
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
      
      {/* 控制按鈕 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
        <Button
          onClick={startAnimation}
          disabled={isAnimating}
          variant="secondary"
          size="lg"
          className="bg-secondary/80 hover:bg-secondary text-secondary-foreground backdrop-blur-sm"
        >
          {isAnimating ? "開門中..." : "開始"}
        </Button>
        
        <Button
          onClick={resetAnimation}
          variant="outline"
          size="lg"
          className="bg-background/80 hover:bg-background/90 backdrop-blur-sm"
        >
          重置
        </Button>
      </div>

      {/* 進度指示器 */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex gap-2">
          {selectedConfig.progressMarkers.map((_, index) => (
            <div
              key={`${selectedConfig.id}-${index}`}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index <= currentMarker
                  ? "bg-secondary shadow-lg shadow-secondary/50"
                  : "bg-muted/50 border border-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoorAnimation3D;
