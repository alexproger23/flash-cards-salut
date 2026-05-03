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
      className="card-container w-full cursor-pointer select-none"
      style={{ perspective: "1200px", height: "320px" }}
      onClick={handleClick}
      role="button"
      aria-label={isFlipped ? "Card showing answer — click to flip back" : "Card showing question — click to reveal answer"}
    >
      <div
        className="card-inner relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-3xl bg-white flex flex-col items-center justify-center p-10"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            boxShadow: "0 4px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {frontLabel && (
            <span
              className="absolute top-6 left-8 text-xs tracking-widest uppercase"
              style={{ color: "#b0b0b8" }}
            >
              {frontLabel}
            </span>
          )}
          <p
            className="text-center"
            style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "#1a1a2e", lineHeight: 1.4 }}
          >
            {front}
          </p>
          <span
            className="absolute bottom-6 text-xs"
            style={{ color: "#c8c8d0" }}
          >
            tap to reveal
          </span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-10"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "#1a1a2e",
            boxShadow: "0 4px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {backLabel && (
            <span
              className="absolute top-6 left-8 text-xs tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {backLabel}
            </span>
          )}
          <p
            className="text-center"
            style={{ fontSize: "clamp(1rem, 3.5vw, 1.4rem)", color: "#ffffff", lineHeight: 1.6 }}
          >
            {back}
          </p>
        </div>
      </div>
    </div>
  );
}
