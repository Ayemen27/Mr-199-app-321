import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloatingButton } from "./floating-button-context";

export default function FloatingAddButton() {
  const { floatingAction, floatingLabel } = useFloatingButton();
  
  // إذا لم يتم تعيين action، لا نعرض الزر
  if (!floatingAction) {
    return null;
  }

  const handleClick = () => {
    if (floatingAction) {
      floatingAction();
    }
  };

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-primary hover:bg-primary/90"
      size="icon"
      title={floatingLabel}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}