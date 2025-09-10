import { useState } from "react";
import DoorAnimation from "@/components/DoorAnimation";
import MainContent from "@/components/MainContent";

const Index = () => {
  const [showMainContent, setShowMainContent] = useState(false);

  const handleAnimationComplete = () => {
    setShowMainContent(true);
  };

  if (showMainContent) {
    return <MainContent />;
  }

  return <DoorAnimation onComplete={handleAnimationComplete} />;
};

export default Index;
