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
      className="w-full cursor-pointer select-none"
      style={{ perspective: "1200px", height: "100%" }}
      onClick={handleClick}
      role="button"
      aria-label={isFlipped ? "Показывает ответ — нажмите, чтобы перевернуть" : "Показывает вопрос — нажмите, чтобы узнать ответ"}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Лицевая сторона (Вопрос) */}
        <div
          className="absolute inset-0 rounded-3xl bg-card border border-border shadow-md flex flex-col items-center justify-center p-10"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {frontLabel && (
            <span className="absolute top-6 left-8 text-xs tracking-widest uppercase text-muted-foreground font-medium">
              {frontLabel}
            </span>
          )}
          
          <p className="text-center text-foreground font-medium" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", lineHeight: 1.4 }}>
            {front}
          </p>
          
          <span className="absolute bottom-6 text-xs text-muted-foreground/60">
            нажмите, чтобы перевернуть
          </span>
        </div>

        {/* Обратная сторона (Ответ) */}
        <div
          className="absolute inset-0 rounded-3xl bg-primary text-primary-foreground shadow-lg flex flex-col items-center justify-center p-10"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {backLabel && (
            <span className="absolute top-6 left-8 text-xs tracking-widest uppercase text-primary-foreground/50 font-medium">
              {backLabel}
            </span>
          )}
          
          <p className="text-center" style={{ fontSize: "clamp(1rem, 3.5vw, 1.4rem)", lineHeight: 1.6 }}>
            {back}
          </p>
        </div>
      </div>
    </div>
  );
}