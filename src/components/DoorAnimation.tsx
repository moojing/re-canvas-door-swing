import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface DoorFrame {
  doorAngle: number;
  cameraDistance: number;
  brightness: number;
  fadeOut?: number;
}

interface DoorAnimationProps {
  onComplete?: () => void;
}

const DoorAnimation = ({ onComplete }: DoorAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Animation frames based on the screenshots
  const frames: DoorFrame[] = [
    { doorAngle: 0, cameraDistance: 1, brightness: 0.3 }, // Door closed
    { doorAngle: 0.3, cameraDistance: 1.1, brightness: 0.5 }, // Door slightly open
    { doorAngle: 0.7, cameraDistance: 1.2, brightness: 0.7 }, // Door more open
    { doorAngle: 1, cameraDistance: 1.3, brightness: 0.9 }, // Door fully open
    { doorAngle: 1, cameraDistance: 1.8, brightness: 1.0 }, // Continue forward
    { doorAngle: 1, cameraDistance: 2.5, brightness: 1.0, fadeOut: 1 }, // Fade out
  ];

  const drawDoor = (
    ctx: CanvasRenderingContext2D,
    frame: DoorFrame,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // Clear canvas with deep black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Apply camera distance (zoom effect)
    const scale = frame.cameraDistance;
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

    // Draw door frame
    const doorFrameX = canvasWidth * 0.3;
    const doorFrameY = canvasHeight * 0.1;
    const doorFrameWidth = canvasWidth * 0.4;
    const doorFrameHeight = canvasHeight * 0.8;

    // Door frame (stone/concrete)
    ctx.fillStyle = `rgba(40, 35, 30, ${frame.brightness * 0.8})`;
    ctx.fillRect(doorFrameX - 20, doorFrameY, doorFrameWidth + 40, doorFrameHeight);

    // Inner door frame shadow
    ctx.fillStyle = `rgba(20, 15, 10, ${frame.brightness * 0.9})`;
    ctx.fillRect(doorFrameX - 10, doorFrameY + 10, doorFrameWidth + 20, doorFrameHeight - 20);

    // Door panels (wood texture simulation)
    if (frame.doorAngle < 1) {
      ctx.save();
      
      // Set up door transformation
      const doorCenterX = doorFrameX;
      const doorOpenness = frame.doorAngle;
      
      ctx.translate(doorCenterX, doorFrameY + doorFrameHeight / 2);
      ctx.scale(Math.cos(doorOpenness * Math.PI / 2), 1);
      ctx.translate(-doorCenterX, -(doorFrameY + doorFrameHeight / 2));

      // Main door color (dark wood)
      const woodBrightness = frame.brightness * 0.6;
      ctx.fillStyle = `rgba(80, 50, 30, ${woodBrightness})`;
      ctx.fillRect(doorFrameX, doorFrameY + 10, doorFrameWidth, doorFrameHeight - 20);

      // Door panels (upper and lower)
      ctx.fillStyle = `rgba(60, 35, 20, ${woodBrightness * 0.8})`;
      
      // Upper panel
      ctx.fillRect(
        doorFrameX + 20,
        doorFrameY + 30,
        doorFrameWidth - 40,
        (doorFrameHeight - 80) * 0.4
      );
      
      // Lower panel
      ctx.fillRect(
        doorFrameX + 20,
        doorFrameY + 50 + (doorFrameHeight - 80) * 0.4,
        doorFrameWidth - 40,
        (doorFrameHeight - 80) * 0.4
      );

      // Door glass/window (dark reflection)
      ctx.fillStyle = `rgba(10, 15, 20, ${woodBrightness * 0.9})`;
      ctx.fillRect(
        doorFrameX + 40,
        doorFrameY + 50,
        doorFrameWidth - 80,
        (doorFrameHeight - 100) * 0.3
      );

      // Door handle
      ctx.fillStyle = `rgba(120, 100, 60, ${frame.brightness})`;
      ctx.beginPath();
      ctx.arc(
        doorFrameX + doorFrameWidth - 60,
        doorFrameY + doorFrameHeight * 0.55,
        8,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    }

    // Ambient lighting effect
    if (frame.doorAngle > 0.2) {
      const gradient = ctx.createRadialGradient(
        canvasWidth / 2,
        canvasHeight / 2,
        0,
        canvasWidth / 2,
        canvasHeight / 2,
        canvasWidth * 0.8
      );
      gradient.addColorStop(0, `rgba(80, 50, 20, ${frame.brightness * 0.1})`);
      gradient.addColorStop(1, "rgba(20, 10, 5, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Letterbox effect for cinematic feel
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight * 0.1);
    ctx.fillRect(0, canvasHeight * 0.9, canvasWidth, canvasHeight * 0.1);

    // Fade out effect
    if (frame.fadeOut && frame.fadeOut > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${frame.fadeOut})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.restore();
  };

  const startAnimation = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setCurrentFrame(0);
    
    const animationDuration = 5000; // 5 seconds total
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Smooth easing function
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easedProgress = easeInOutCubic(progress);
      
      // Interpolate between frames with extended animation
      let doorAngle, cameraDistance, brightness, fadeOut = 0;
      
      if (easedProgress <= 0.6) {
        // Door opening phase (0-60%)
        const doorProgress = easedProgress / 0.6;
        doorAngle = doorProgress;
        cameraDistance = 1 + (doorProgress * 0.3);
        brightness = 0.3 + (doorProgress * 0.6);
      } else if (easedProgress <= 0.9) {
        // Continue forward phase (60-90%)
        const forwardProgress = (easedProgress - 0.6) / 0.3;
        doorAngle = 1;
        cameraDistance = 1.3 + (forwardProgress * 1.2);
        brightness = 0.9 + (forwardProgress * 0.1);
      } else {
        // Fade out phase (90-100%)
        const fadeProgress = (easedProgress - 0.9) / 0.1;
        doorAngle = 1;
        cameraDistance = 2.5;
        brightness = 1.0;
        fadeOut = fadeProgress;
      }
      
      const interpolatedFrame: DoorFrame = {
        doorAngle,
        cameraDistance,
        brightness,
        fadeOut
      };
      
      drawDoor(ctx, interpolatedFrame, canvas.width, canvas.height);
      
      // Update progress indicator
      const frameIndex = Math.floor(easedProgress * (frames.length - 1));
      setCurrentFrame(frameIndex);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        // Trigger completion callback after a short delay
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const resetAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsAnimating(false);
    setCurrentFrame(0);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawDoor(ctx, frames[0], canvas.width, canvas.height);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawDoor(ctx, frames[currentFrame], canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    // Initial draw
    const ctx = canvas.getContext("2d");
    if (ctx) {
      drawDoor(ctx, frames[0], canvas.width, canvas.height);
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
      
      {/* Controls overlay */}
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

      {/* Progress indicator */}
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

      {/* Atmospheric overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-background/20" />
    </div>
  );
};

export default DoorAnimation;