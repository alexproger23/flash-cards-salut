import React, { useState } from "react";

interface FlashCardProps {
  front: string;
  back: string;
  frontLabel?: string;
  backLabel?: string;
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
}

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
        <div className="card-face bg-card border-[3px] border-border rounded-[3rem] p-10 flex flex-col justify-between shadow-xl">
          <div className="text-center h-6">
            {frontLabel && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                {frontLabel}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-center font-black text-foreground break-words" style={{ fontSize: "clamp(1.5rem, 8vw, 2.75rem)" }}>
              {front}
            </h2>
          </div>
          <div className="text-center text-[9px] font-black text-muted-foreground/60 uppercase">
            Нажми для ответа
          </div>
        </div>

        {/* ОБРАТНАЯ СТОРОНА */}
        <div className="card-face card-face-back bg-card border-[3px] border-primary/30 rounded-[3rem] p-10 flex flex-col justify-between shadow-2xl">
          <div className="text-center h-6">
            {backLabel && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                {backLabel}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center overflow-y-auto no-scrollbar">
            <p className="text-center font-bold text-foreground" style={{ fontSize: "clamp(1.1rem, 5vw, 1.5rem)" }}>
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