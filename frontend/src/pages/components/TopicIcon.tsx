import React from "react";
import * as Icons from "lucide-react";

interface TopicIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function TopicIcon({ name, size = 24, className = "" }: TopicIconProps) {
  // 1. Проверяем, является ли "name" обычным эмодзи (через регулярку на юникод-символы)
  const isEmoji = /\p{Emoji}/u.test(name) && name.length <= 4;

  if (isEmoji) {
    return (
      <span 
        style={{ fontSize: `${size}px` }} 
        className={`leading-none inline-block ${className}`}
      >
        {name}
      </span>
    );
  }

  // 2. Если это не эмодзи, ищем иконку в Lucide
  const LucideIcon = (Icons as any)[name];

  if (LucideIcon) {
    return <LucideIcon size={size} className={className} />;
  }

  // 3. Фолбек, если ничего не подошло
  return <Icons.BookText size={size} className={className} />;
}