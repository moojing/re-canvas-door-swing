import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import * as THREE from "three";

interface DoorProps {
  doorAngle: number;
  onAnimationComplete?: () => void;
}

const Door = ({ doorAngle }: DoorProps) => {
  const doorGroupRef = useRef<THREE.Group>(null);
  const doorPlaneRef = useRef<THREE.Mesh>(null);
  
  // 加載紋理圖片
  const doorTexture = useLoader(THREE.TextureLoader, '/textures/door-2.png');
  
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
        <mesh ref={doorPlaneRef} position={[1.5, 0, 0.155]}>
          <planeGeometry args={[2.9, 5.9]} />
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
  cameraDistance, 
  fadeOut, 
  onAnimationComplete 
}: { 
  cameraDistance: number; 
  fadeOut: number;
  onAnimationComplete?: () => void;
}) => {
  const { camera } = useThree();
  const fadeRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    // 控制攝像機向前移動
    camera.position.z = 8 - (cameraDistance - 1) * 5;
    
    // 控制淡出效果
    if (fadeRef.current) {
      const material = fadeRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = fadeOut;
      
      // 當完全淡出時觸發動畫完成
      if (fadeOut >= 0.99) {
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
  cameraDistance, 
  fadeOut, 
  onAnimationComplete 
}: { 
  doorAngle: number; 
  cameraDistance: number; 
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
        cameraDistance={cameraDistance} 
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [doorAngle, setDoorAngle] = useState(0);
  const [cameraDistance, setCameraDistance] = useState(1);
  const [fadeOut, setFadeOut] = useState(0);

  const frames = [
    { doorAngle: 0, cameraDistance: 1, fadeOut: 0 }, // 門關閉
    { doorAngle: 0.3, cameraDistance: 1.1, fadeOut: 0 }, // 門微開
    { doorAngle: 0.7, cameraDistance: 1.2, fadeOut: 0 }, // 門更開
    { doorAngle: 1, cameraDistance: 1.3, fadeOut: 0 }, // 門全開
    { doorAngle: 1, cameraDistance: 1.8, fadeOut: 0 }, // 繼續前進
    { doorAngle: 1, cameraDistance: 2.5, fadeOut: 1 }, // 淡出
  ];

  const startAnimation = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setCurrentFrame(0);
    
    const animationDuration = 5000; // 5秒
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // 緩動函數
      const easeInOutCubic = (t: number) => 
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easedProgress = easeInOutCubic(progress);
      
      // 插值計算
      let newDoorAngle: number, newCameraDistance: number, newFadeOut = 0;
      
      if (easedProgress <= 0.6) {
        // 開門階段 (0-60%)
        const doorProgress = easedProgress / 0.6;
        newDoorAngle = doorProgress;
        newCameraDistance = 1 + (doorProgress * 0.3);
      } else if (easedProgress <= 0.9) {
        // 前進階段 (60-90%)
        const forwardProgress = (easedProgress - 0.6) / 0.3;
        newDoorAngle = 1;
        newCameraDistance = 1.3 + (forwardProgress * 1.2);
      } else {
        // 淡出階段 (90-100%)
        const fadeProgress = (easedProgress - 0.9) / 0.1;
        newDoorAngle = 1;
        newCameraDistance = 2.5;
        newFadeOut = fadeProgress;
      }
      
      setDoorAngle(newDoorAngle);
      setCameraDistance(newCameraDistance);
      setFadeOut(newFadeOut);
      
      // 更新進度指示器
      const frameIndex = Math.floor(easedProgress * (frames.length - 1));
      setCurrentFrame(frameIndex);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const resetAnimation = () => {
    setIsAnimating(false);
    setCurrentFrame(0);
    setDoorAngle(0);
    setCameraDistance(1);
    setFadeOut(0);
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
          cameraDistance={cameraDistance}
          fadeOut={fadeOut}
          onAnimationComplete={handleAnimationComplete}
        />
      </Canvas>
      
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
          {frames.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index <= currentFrame
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