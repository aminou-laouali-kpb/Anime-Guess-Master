import React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

// Three hearts, announced as one image ("Tes vies : 2 sur 3").
export const Lives: React.FC<{
  lives: number | undefined;
  label: string;
  className: string;
  fullClassName: string;
}> = ({ lives, label, className, fullClassName }) => (
  <div className={cn("flex", className)} role="img" aria-label={label}>
    {Array.from({ length: 3 }).map((_, i) => (
      <Heart
        key={i}
        className={cn("w-5 h-5", i < (lives || 0) ? fullClassName : "fill-muted text-muted-foreground opacity-30")}
      />
    ))}
  </div>
);
