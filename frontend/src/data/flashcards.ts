export interface Card {
  id: number;
  front: string;
  back: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  emoji: string; // Теперь здесь будет название иконки Lucide
  frontLabel: string;
  backLabel: string;
  color: string;
  cards: Card[];
}

export const topics: Topic[] = [
  {
    id: "english-vocabulary",
    title: "English Vocabulary",
    description: "Learn common English words and their meanings",
    emoji: "Languages", // Было: 📖
    frontLabel: "Word",
    backLabel: "Definition",
    color: "#f0f4ff",
    cards: [
      { id: 1, front: "Ephemeral", back: "Lasting for a very short time; transitory" },
      { id: 2, front: "Serendipity", back: "The occurrence of events by chance in a happy or beneficial way" },
      { id: 3, front: "Eloquent", back: "Fluent or persuasive in speaking or writing" },
      { id: 4, front: "Melancholy", back: "A feeling of pensive sadness, typically with no obvious cause" },
      { id: 5, front: "Resilient", back: "Able to recover quickly from difficulties; tough" },
      { id: 6, front: "Ambiguous", back: "Open to more than one interpretation; not clear" },
      { id: 7, front: "Pragmatic", back: "Dealing with things sensibly and realistically" },
      { id: 8, front: "Tenacious", back: "Tending to keep a firm hold; persistent and determined" },
      { id: 9, front: "Verbose", back: "Using more words than needed; long-winded" },
      { id: 10, front: "Candid", back: "Truthful and straightforward; frank" },
      { id: 11, front: "Profound", back: "Having deep insight or understanding; very great" },
      { id: 12, front: "Whimsical", back: "Playfully quaint or fanciful; acting on impulse" },
    ],
  },
  {
    id: "history-dates",
    title: "History Dates",
    description: "Key moments that shaped world history",
    emoji: "History", // Было: 🏛️
    frontLabel: "Date",
    backLabel: "Event",
    color: "#fff8f0",
    cards: [
      { id: 1, front: "1066", back: "The Norman Conquest of England — William the Conqueror defeats King Harold at the Battle of Hastings" },
      { id: 2, front: "1215", back: "King John of England signs the Magna Carta, limiting royal power for the first time" },
      { id: 3, front: "1492", back: "Christopher Columbus reaches the Americas, beginning the age of European exploration" },
      { id: 4, front: "1687", back: "Isaac Newton publishes 'Principia Mathematica', laying the foundations of classical mechanics" },
      { id: 5, front: "1776", back: "The United States Declaration of Independence is signed on July 4th" },
      { id: 6, front: "1789", back: "The French Revolution begins; storming of the Bastille on July 14th" },
      { id: 7, front: "1859", back: "Charles Darwin publishes 'On the Origin of Species'" },
      { id: 8, front: "1903", back: "The Wright Brothers make the first successful powered airplane flight at Kitty Hawk" },
      { id: 9, front: "1945", back: "World War II ends; Germany surrenders in May, Japan in September" },
      { id: 10, front: "1969", back: "Apollo 11 — Neil Armstrong becomes the first person to walk on the Moon" },
      { id: 11, front: "1989", back: "The Berlin Wall falls, symbolizing the end of the Cold War" },
      { id: 12, front: "1991", back: "The World Wide Web is made publicly available by Tim Berners-Lee" },
    ],
  },
  {
    id: "russian-history-years",
    title: "История России: годы",
    description: "20 вопросов по российской истории, где ответом должен быть год",
    emoji: "📜",
    frontLabel: "Событие",
    backLabel: "Год",
    color: "#f7f1e8",
    cards: [
      { id: 1, front: "Призвание варягов и начало правления Рюрика в Новгороде", back: "862" },
      { id: 2, front: "Крещение Руси князем Владимиром", back: "988" },
      { id: 3, front: "Невская битва", back: "1240" },
      { id: 4, front: "Куликовская битва", back: "1380" },
      { id: 5, front: "Стояние на реке Угре и окончание ордынской зависимости", back: "1480" },
      { id: 6, front: "Венчание Ивана IV Грозного на царство", back: "1547" },
      { id: 7, front: "Избрание Михаила Романова на царство", back: "1613" },
      { id: 8, front: "Основание Санкт-Петербурга", back: "1703" },
      { id: 9, front: "Полтавская битва", back: "1709" },
      { id: 10, front: "Провозглашение России империей", back: "1721" },
      { id: 11, front: "Бородинское сражение", back: "1812" },
      { id: 12, front: "Восстание декабристов", back: "1825" },
      { id: 13, front: "Отмена крепостного права", back: "1861" },
      { id: 14, front: "Продажа Аляски США", back: "1867" },
      { id: 15, front: "Начало Русско-японской войны", back: "1904" },
      { id: 16, front: "Февральская и Октябрьская революции в России", back: "1917" },
      { id: 17, front: "Образование СССР", back: "1922" },
      { id: 18, front: "Начало Великой Отечественной войны", back: "1941" },
      { id: 19, front: "Первый полет человека в космос", back: "1961" },
      { id: 20, front: "Принятие Конституции Российской Федерации", back: "1993" },
    ],
  },
  {
    id: "biology-terms",
    title: "Biology Terms",
    description: "Essential concepts from the science of life",
    emoji: "Microscope", // Было: 🔬
    frontLabel: "Term",
    backLabel: "Definition",
    color: "#f0fff4",
    cards: [
      { id: 1, front: "Mitosis", back: "Cell division producing two genetically identical daughter cells with the same chromosome number" },
      { id: 2, front: "Osmosis", back: "The movement of water molecules through a selectively permeable membrane from high to low concentration" },
      { id: 3, front: "Photosynthesis", back: "The process by which plants convert sunlight, water, and CO₂ into glucose and oxygen" },
      { id: 4, front: "DNA", back: "Deoxyribonucleic acid — the molecule carrying genetic information in all living organisms" },
      { id: 5, front: "Enzyme", back: "A biological catalyst that speeds up chemical reactions without being consumed" },
      { id: 6, front: "Homeostasis", back: "The ability of an organism to maintain stable internal conditions despite external changes" },
      { id: 7, front: "Meiosis", back: "Cell division that produces four genetically unique cells with half the chromosome number — used in reproduction" },
      { id: 8, front: "Allele", back: "A variant form of a gene that can produce different traits in an organism" },
      { id: 9, front: "Ribosome", back: "A cellular organelle that synthesizes proteins by translating messenger RNA" },
      { id: 10, front: "Natural Selection", back: "The process where organisms better adapted to their environment tend to survive and reproduce more" },
      { id: 11, front: "ATP", back: "Adenosine triphosphate — the primary energy currency used in cellular processes" },
      { id: 12, front: "Symbiosis", back: "A close, long-term interaction between two different biological organisms" },
    ],
  },
];

export function getTopicById(id: string): Topic | undefined {
  return topics.find((t) => t.id === id);
}

export interface SessionResult {
  topicId: string;
  known: number;
  unknown: number;
  date: string;
}

export function saveSessionResult(result: SessionResult) {
  const key = `flashcard_results_${result.topicId}`;
  const existing = loadSessionResults(result.topicId);
  existing.unshift(result);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 10)));
}

export function loadSessionResults(topicId: string): SessionResult[] {
  const key = `flashcard_results_${topicId}`;
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}