// =============================================================================
// African Safari Odyssey — Localization Engine (i18n)
// -----------------------------------------------------------------------------
// Self-contained module: exports the 5-language dictionary (English, Swahili,
// Amharic, French, Arabic), the Region / QuestionType domain types, and pure
// helpers for translation lookup, RTL detection and localized question phrasing.
//
// This file intentionally imports NOTHING from the rest of the project so it can
// be consumed by App.tsx / data.ts / the Phaser scene without coupling risk.
// Language choice is persisted to localStorage under LANG_STORAGE_KEY.
// =============================================================================

export type Lang = "en" | "sw" | "am" | "fr" | "ar";

export type Region =
  | "north"
  | "east"
  | "west"
  | "central"
  | "southern"
  | "island";

export type QuestionType = "capital" | "flag" | "landmark" | "reverse";

export const LANG_STORAGE_KEY = "safari-odyssey-lang";
export const FILTERS_STORAGE_KEY = "safari-odyssey-filters";

/** Ordered list used to render the language switcher. */
export const LANGUAGES: ReadonlyArray<{ code: Lang; label: string; native: string }> = [
  { code: "en", label: "English", native: "English" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "am", label: "Amharic", native: "አማርኛ" },
  { code: "fr", label: "French", native: "Français" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

/** Arabic is right-to-left; everything else is left-to-right. */
export const RTL_LANGS: ReadonlySet<Lang> = new Set<Lang>(["ar"]);

export const isRTL = (lang: Lang): boolean => RTL_LANGS.has(lang);

export const REGIONS: ReadonlyArray<Region> = [
  "north",
  "east",
  "west",
  "central",
  "southern",
  "island",
];

export const QUESTION_TYPES: ReadonlyArray<QuestionType> = [
  "capital",
  "flag",
  "landmark",
  "reverse",
];

// Flat dictionary of UI strings keyed by logical id, one row per language.
// Missing keys fall back to English via `t()`.
type Dict = Record<string, string>;

const en: Dict = {
  "app.title": "African Safari Geography Odyssey",
  "app.subtitle": "Explore the continent, one question at a time",
  "menu.quickPlay": "Quick Play",
  "menu.startCustom": "Start Custom Expedition",
  "menu.notebook": "Safari Notebook",
  "menu.highscores": "High Scores",
  "menu.back": "Back to Menu",
  "menu.resume": "Resume",
  "menu.restart": "Restart",
  "menu.playAgain": "Play Again",
  "menu.challenge": "Challenge a Friend",
  "menu.settings": "Settings",
  "menu.language": "Language",

  "setup.title": "Custom Expedition Setup",
  "setup.regions": "Select Sub-Regions",
  "setup.types": "Question Types",
  "setup.selectAll": "Select All",
  "setup.clearAll": "Clear All",
  "setup.allRegions": "All Regions",
  "setup.allTypes": "All Question Types",
  "setup.count": "Question Count",
  "setup.estimate": "Estimated questions",
  "setup.start": "Start Expedition",
  "setup.validation": "Select at least one region and one question type",
  "setup.count10": "10",
  "setup.count20": "20",
  "setup.countFull": "Full",

  "region.north": "North Africa",
  "region.east": "East Africa",
  "region.west": "West Africa",
  "region.central": "Central Africa",
  "region.southern": "Southern Africa",
  "region.island": "Island Nations",

  "type.capital": "Capitals",
  "type.flag": "Flags",
  "type.landmark": "Landmarks",
  "type.reverse": "Reverse Trivia",

  "hud.score": "Score",
  "hud.streak": "Streak",
  "hud.multiplier": "Multiplier",
  "hud.time": "Time",
  "hud.correct": "Correct",
  "hud.incorrect": "Incorrect",
  "hud.next": "Next",
  "hud.flip": "Tap to flip",
  "hud.mastered": "Mastered",
  "hud.accuracy": "Accuracy",
  "hud.question": "Question",
  "hud.progress": "Progress",

  "q.capital": "What is the capital of {country}?",
  "q.flag": "Which country has this flag?",
  "q.landmark": "Where is {landmark} located?",
  "q.reverse": "{capital} is the capital of which country?",
  "q.locator": "Tap the location of {country} on the map.",

  "summary.title": "Expedition Summary",
  "summary.rank": "Rank",
  "summary.finish": "Expedition Complete",
};

const sw: Dict = {
  "app.title": "Safari ya Jiografia ya Afrika",
  "app.subtitle": "Gundua bara, swali baada ya swali",
  "menu.quickPlay": "Cheza Haraka",
  "menu.startCustom": "Anza Safari Maalum",
  "menu.notebook": "Kumbukumbu ya Safari",
  "menu.highscores": "Alama za Juu",
  "menu.back": "Rudi Menuni",
  "menu.resume": "Endelea",
  "menu.restart": "Anza Upya",
  "menu.playAgain": "Cheza Tena",
  "menu.challenge": "Changanya Rafiki",
  "menu.settings": "Mipangilio",
  "menu.language": "Lugha",

  "setup.title": "Mipangilio ya Safari Maalum",
  "setup.regions": "Chagua Kanda",
  "setup.types": "Aina za Maswali",
  "setup.selectAll": "Chagua Zote",
  "setup.clearAll": "Futa Zote",
  "setup.allRegions": "Kanda Zote",
  "setup.allTypes": "Aina Zote za Maswali",
  "setup.count": "Idadi ya Maswali",
  "setup.estimate": "Maswali yanayotarajiwa",
  "setup.start": "Anza Safari",
  "setup.validation": "Chagua angalau kanda na aina moja ya swali",
  "setup.count10": "10",
  "setup.count20": "20",
  "setup.countFull": "Zote",

  "region.north": "Afrika Kaskazini",
  "region.east": "Afrika Mashariki",
  "region.west": "Afrika Magharibi",
  "region.central": "Afrika ya Kati",
  "region.southern": "Afrika Kusini",
  "region.island": "Visiwa",

  "type.capital": "Miji Mikuu",
  "type.flag": "Bendera",
  "type.landmark": "Alamisho",
  "type.reverse": "Maswali ya Kinyume",

  "hud.score": "Alama",
  "hud.streak": "Mfululizo",
  "hud.multiplier": "Kizidishi",
  "hud.time": "Muda",
  "hud.correct": "Sahihi",
  "hud.incorrect": "Sio Sahihi",
  "hud.next": "Ifuatayo",
  "hud.flip": "Gusa kubadilisha",
  "hud.mastered": "Imeelimika",
  "hud.accuracy": "Usahihi",
  "hud.question": "Swali",
  "hud.progress": "Maendeleo",

  "q.capital": "Mji mkuu wa {country} ni upi?",
  "q.flag": "Ni nchi ipi ina bendera hii?",
  "q.landmark": "{landmark} iko wapi?",
  "q.reverse": "{capital} ni mji mkuu wa nchi ipi?",
  "q.locator": "Gusa mahali pa {country} kwenye ramani.",

  "summary.title": "Muhtasari wa Safari",
  "summary.rank": "Cheo",
  "summary.finish": "Safari Imekamilika",
};

const am: Dict = {
  "app.title": "የአፍሪካ ሳፋሪ የጂኦግራፊ ጉዞ",
  "app.subtitle": "አህጉሪቱን አንድ ጥያቄ በአንድ ጊዜ ያስሱ",
  "menu.quickPlay": "ፈጣን ጨዋታ",
  "menu.startCustom": "ብጁ ጉዞ ጀምር",
  "menu.notebook": "የሳፋሪ መዝገብ",
  "menu.highscores": "ከፍተኛ ነጥቦች",
  "menu.back": "ወደ ዝርዝር ተመለስ",
  "menu.resume": "ቀጥል",
  "menu.restart": "እንደገና ጀምር",
  "menu.playAgain": "እንደገና ተጫወት",
  "menu.challenge": "ጓደኛ ፈትሽ",
  "menu.settings": "ቅንብሮች",
  "menu.language": "ቋንቋ",

  "setup.title": "ብጁ የጉዞ ዝግጅት",
  "setup.regions": "ንዑስ ክልሎችን ይምረጡ",
  "setup.types": "የጥያቄ ዓይነቶች",
  "setup.selectAll": "ሁሉንም ምረጥ",
  "setup.clearAll": "ሁሉንም አጽዳ",
  "setup.allRegions": "ሁሉም ክልሎች",
  "setup.allTypes": "ሁሉም የጥያቄ ዓይነቶች",
  "setup.count": "የጥያቄ ብዛት",
  "setup.estimate": "የሚጠበቁ ጥያቄዎች",
  "setup.start": "ጉዞ ጀምር",
  "setup.validation": "ቢያንስ አንድ ክልል እና አንድ የጥያቄ ዓይነት ይምረጡ",
  "setup.count10": "10",
  "setup.count20": "20",
  "setup.countFull": "ሙሉ",

  "region.north": "የሰሜን አፍሪካ",
  "region.east": "የምስራቅ አፍሪካ",
  "region.west": "የምዕራብ አፍሪካ",
  "region.central": "የመካከለኛ አፍሪካ",
  "region.southern": "የደቡብ አፍሪካ",
  "region.island": "የደሴት አገሮች",

  "type.capital": "ዋና ከተሞች",
  "type.flag": "ደሮች",
  "type.landmark": "ታሪካዊ ማሳያዎች",
  "type.reverse": "ተገላቢጦሽ ጥያቄ",

  "hud.score": "ነጥብ",
  "hud.streak": "ተከታታይ",
  "hud.multiplier": "አባዢ",
  "hud.time": "ሰዓት",
  "hud.correct": "ትክክል",
  "hud.incorrect": "ስህተት",
  "hud.next": "ቀጥል",
  "hud.flip": "ለመገልበጥ ንካ",
  "hud.mastered": "ተገዝቧል",
  "hud.accuracy": "ትክክለኛነት",
  "hud.question": "ጥያቄ",
  "hud.progress": "እድገት",

  "q.capital": "የ{country} ዋና ከተማ ምንድን ነው?",
  "q.flag": "ይህ ደሮ የየትኛው አገር ነው?",
  "q.landmark": "{landmark} የሚገኘው በየት ነው?",
  "q.reverse": "{capital} የየትኛው አገር ዋና ከተማ ነው?",
  "q.locator": "የ{country}ን አካባቢ በካርታው ላይ ንካ።",

  "summary.title": "የጉዞ ማጠቃለያ",
  "summary.rank": "ደረጃ",
  "summary.finish": "ጉዞ ተጠናቋል",
};

const fr: Dict = {
  "app.title": "Odyssée Géographique du Safari Africain",
  "app.subtitle": "Explorez le continent, une question à la fois",
  "menu.quickPlay": "Partie Rapide",
  "menu.startCustom": "Démarrer une Expédition Personnalisée",
  "menu.notebook": "Carnet de Safari",
  "menu.highscores": "Meilleurs Scores",
  "menu.back": "Retour au Menu",
  "menu.resume": "Reprendre",
  "menu.restart": "Recommencer",
  "menu.playAgain": "Rejouer",
  "menu.challenge": "Défier un Ami",
  "menu.settings": "Paramètres",
  "menu.language": "Langue",

  "setup.title": "Configuration de l'Expédition Personnalisée",
  "setup.regions": "Sélectionner les Sous-Régions",
  "setup.types": "Types de Questions",
  "setup.selectAll": "Tout Sélectionner",
  "setup.clearAll": "Tout Effacer",
  "setup.allRegions": "Toutes les Régions",
  "setup.allTypes": "Tous les Types de Questions",
  "setup.count": "Nombre de Questions",
  "setup.estimate": "Questions estimées",
  "setup.start": "Démarrer l'Expédition",
  "setup.validation": "Sélectionnez au moins une région et un type de question",
  "setup.count10": "10",
  "setup.count20": "20",
  "setup.countFull": "Complet",

  "region.north": "Afrique du Nord",
  "region.east": "Afrique de l'Est",
  "region.west": "Afrique de l'Ouest",
  "region.central": "Afrique Centrale",
  "region.southern": "Afrique Australe",
  "region.island": "Nations Insulaires",

  "type.capital": "Capitales",
  "type.flag": "Drapeaux",
  "type.landmark": "Monuments",
  "type.reverse": "Trivia Inversé",

  "hud.score": "Score",
  "hud.streak": "Série",
  "hud.multiplier": "Multiplicateur",
  "hud.time": "Temps",
  "hud.correct": "Correct",
  "hud.incorrect": "Incorrect",
  "hud.next": "Suivant",
  "hud.flip": "Touchez pour retourner",
  "hud.mastered": "Maîtrisé",
  "hud.accuracy": "Précision",
  "hud.question": "Question",
  "hud.progress": "Progression",

  "q.capital": "Quelle est la capitale de {country} ?",
  "q.flag": "De quel pays est ce drapeau ?",
  "q.landmark": "Où se trouve {landmark} ?",
  "q.reverse": "{capital} est la capitale de quel pays ?",
  "q.locator": "Touchez l'emplacement de {country} sur la carte.",

  "summary.title": "Résumé de l'Expédition",
  "summary.rank": "Rang",
  "summary.finish": "Expédition Terminée",
};

const ar: Dict = {
  "app.title": "مغامرة جغرافيا سفاري أفريقيا",
  "app.subtitle": "استكشف القارة، سؤالًا تلو الآخر",
  "menu.quickPlay": "لعب سريع",
  "menu.startCustom": "ابدأ رحلة مخصصة",
  "menu.notebook": "دفتر السفاري",
  "menu.highscores": "أعلى النتائج",
  "menu.back": "العودة إلى القائمة",
  "menu.resume": "استئناف",
  "menu.restart": "إعادة البدء",
  "menu.playAgain": "العب مجددًا",
  "menu.challenge": "تحدَّ صديقًا",
  "menu.settings": "الإعدادات",
  "menu.language": "اللغة",

  "setup.title": "إعداد الرحلة المخصصة",
  "setup.regions": "اختر المناطق الفرعية",
  "setup.types": "أنواع الأسئلة",
  "setup.selectAll": "تحديد الكل",
  "setup.clearAll": "مسح الكل",
  "setup.allRegions": "كل المناطق",
  "setup.allTypes": "كل أنواع الأسئلة",
  "setup.count": "عدد الأسئلة",
  "setup.estimate": "الأسئلة المقدّرة",
  "setup.start": "ابدأ الرحلة",
  "setup.validation": "اختر منطقة واحدة ونوع سؤال واحدًا على الأقل",
  "setup.count10": "10",
  "setup.count20": "20",
  "setup.countFull": "الكل",

  "region.north": "شمال أفريقيا",
  "region.east": "شرق أفريقيا",
  "region.west": "غرب أفريقيا",
  "region.central": "وسط أفريقيا",
  "region.southern": "جنوب أفريقيا",
  "region.island": "دول الجزر",

  "type.capital": "العواصم",
  "type.flag": "الأعلام",
  "type.landmark": "المعالم",
  "type.reverse": "أسئلة عكسية",

  "hud.score": "النقاط",
  "hud.streak": "التتابع",
  "hud.multiplier": "المضاعف",
  "hud.time": "الوقت",
  "hud.correct": "صحيح",
  "hud.incorrect": "خطأ",
  "hud.next": "التالي",
  "hud.flip": "اضغط للقلب",
  "hud.mastered": "تم الإتقان",
  "hud.accuracy": "الدقة",
  "hud.question": "السؤال",
  "hud.progress": "التقدّم",

  "q.capital": "ما هي عاصمة {country}؟",
  "q.flag": "أي دولة يرمز إليها هذا العلم؟",
  "q.landmark": "أين يقع {landmark}؟",
  "q.reverse": "{capital} هي عاصمة أي دولة؟",
  "q.locator": "اضغط على موقع {country} على الخريطة.",

  "summary.title": "ملخص الرحلة",
  "summary.rank": "الترتيب",
  "summary.finish": "اكتملت الرحلة",
};

const DICTIONARIES: Record<Lang, Dict> = { en, sw, am, fr, ar };

/** Translate a key for a language, falling back to English when missing. */
export function t(lang: Lang, key: string): string {
  return DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? key;
}

/** Returns a translator bound to a specific language. */
export const makeT =
  (lang: Lang) =>
  (key: string): string =>
    t(lang, key);

/** Interpolate `{placeholder}` tokens in a translated template. */
export function format(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** Build a localized question prompt for a given type. */
export function questionPrompt(
  lang: Lang,
  type: QuestionType,
  vars: Record<string, string | number>,
): string {
  const key =
    type === "capital"
      ? "q.capital"
      : type === "flag"
        ? "q.flag"
        : type === "landmark"
          ? "q.landmark"
          : "q.reverse";
  return format(t(lang, key), vars);
}

/** Localized label for a sub-region. */
export const regionLabel = (lang: Lang, region: Region): string =>
  t(lang, `region.${region}`);

/** Localized label for a question type. */
export const typeLabel = (lang: Lang, type: QuestionType): string =>
  t(lang, `type.${type}`);

/** Read the persisted language, defaulting to English for unknown values. */
export function loadLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && stored in DICTIONARIES) return stored as Lang;
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall through */
  }
  return "en";
}

/** Persist the active language to localStorage. */
export function saveLang(lang: Lang): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore quota / privacy errors */
  }
}

/** BCP-47 tag per language, useful for speech synthesis + `lang` attributes. */
export const LOCALE_TAG: Record<Lang, string> = {
  en: "en-US",
  sw: "sw-KE",
  am: "am-ET",
  fr: "fr-FR",
  ar: "ar-SA",
};
