import { useState } from "react";
import DoorAnimation3D from "@/components/DoorAnimation3D";
import MainContent from "@/components/MainContent";

const Index = () => {
  const [showMainContent, setShowMainContent] = useState(false);

  const handleAnimationComplete = () => {
    setShowMainContent(true);
  };

  if (showMainContent) {
    return <MainContent />;
  }

  return <DoorAnimation3D onComplete={handleAnimationComplete} />;
};

export default Index;
