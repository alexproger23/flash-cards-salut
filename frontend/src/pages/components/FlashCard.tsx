import React, { useState } from "react";

interface FlashCardProps {
  front: string;
  back: string;
  frontLabel?: string;
  backLabel?: string;
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
}

const getAdaptiveTextStyle = (text: string, side: "front" | "back"): React.CSSProperties => {
  const length = text.trim().length;
  const longestWord = text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);

  let min = side === "front" ? 1.15 : 0.95;
  const baseMax = side === "front" ? 2.6 : 1.55;

  let max = baseMax;
  if (length > 340) {
    min = side === "front" ? 0.8 : 0.72;
    max = side === "front" ? 1.05 : 0.86;
  } else if (length > 260) {
    min = side === "front" ? 0.9 : 0.78;
    max = side === "front" ? 1.2 : 0.95;
  } else if (length > 220) max = side === "front" ? 1.45 : 1.05;
  else if (length > 150) max = side === "front" ? 1.7 : 1.15;
  else if (length > 90) max = side === "front" ? 2.0 : 1.25;
  else if (length > 50) max = side === "front" ? 2.3 : 1.4;

  if (longestWord > 18) {
    min = Math.min(min, side === "front" ? 0.86 : 0.74);
    max = Math.min(max, side === "front" ? 1.65 : 1.1);
  }

  return {
    fontSize: `clamp(${min}rem, ${side === "front" ? "6vw" : "3.8vw"}, ${max}rem)`,
    lineHeight: length > 220 ? 1.1 : length > 120 ? 1.16 : 1.25,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };
};

export function FlashCard({ front, back, frontLabel, backLabel, flipped, onFlip }: FlashCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = flipped ?? internalFlipped;

  const handleClick = () => {
    const next = !isFlipped;
    if (flipped === undefined) {
      setInternalFlipped(next);
    }
    onFlip?.(next);
  };

  return (
    <div
      className="w-full h-full cursor-pointer select-none card-perspective"
      onClick={handleClick}
    >
      <div className={`card-inner ${isFlipped ? "is-flipped" : ""}`}>
        
        {/* ЛИЦЕВАЯ СТОРОНА */}
        <div className="card-face bg-card border-[3px] border-border rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col justify-between shadow-xl overflow-hidden">
          <div className="text-center min-h-5">
            {frontLabel && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                {frontLabel}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden py-3">
            <h2 className="max-h-full overflow-hidden text-center font-black text-foreground" style={getAdaptiveTextStyle(front, "front")}>
              {front}
            </h2>
          </div>
          <div className="text-center text-[9px] font-black text-muted-foreground/60 uppercase">
            Нажми для ответа
          </div>
        </div>

        {/* ОБРАТНАЯ СТОРОНА */}
        <div className="card-face card-face-back bg-card border-[3px] border-primary/30 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col justify-between shadow-2xl overflow-hidden">
          <div className="text-center min-h-5">
            {backLabel && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                {backLabel}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden py-3">
            <p className="max-h-full overflow-hidden text-center font-bold text-foreground" style={getAdaptiveTextStyle(back, "back")}>
              {back}
            </p>
          </div>
          <div className="flex justify-center">
            <div className="px-6 py-1.5 rounded-full bg-primary text-[10px] font-black text-primary-foreground uppercase shadow-lg shadow-primary/20">
              Определение
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
