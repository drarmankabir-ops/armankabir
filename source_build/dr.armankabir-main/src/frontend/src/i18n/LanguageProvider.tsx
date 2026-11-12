import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import bangla from "./bn.json";
import english from "./en.json";

export type Language = "en" | "bn";

const STORAGE_KEY = "armankabir.language";
const englishDictionary: Record<string, string> = english;
const banglaDictionary: Record<string, string> = bangla;
const normalizedEntries = Object.keys(englishDictionary)
  .map((key) => {
    const source = englishDictionary[key];
    const translated = banglaDictionary[key];
    return {
      source,
      translated,
      normalized: source.trim().replace(/\s+/g, " ").toLocaleLowerCase(),
      expression: new RegExp(
        `(^|[^\\p{L}\\p{N}])(${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")})(?=$|[^\\p{L}\\p{N}])`,
        "giu",
      ),
    };
  })
  .sort((left, right) => right.source.length - left.source.length);
const exactTranslations = new Map(
  normalizedEntries.map(({ normalized, translated }) => [
    normalized,
    translated,
  ]),
);
const exactEnglishTranslations = new Map(
  normalizedEntries.map(({ normalized, source }) => [normalized, source]),
);

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

interface TranslationRecord {
  source: string;
  translated: string;
}

const textRecords = new WeakMap<Text, TranslationRecord>();
const attributeRecords = new WeakMap<Element, Map<string, TranslationRecord>>();
const attributeNames = [
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
  "alt",
];

function readLanguage(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "bn" ? "bn" : "en";
  } catch (error) {
    console.warn("Could not read the saved language preference.", error);
    return "en";
  }
}

function translate(value: string, language: Language): string {
  const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (language === "en") {
    return exactEnglishTranslations.get(normalized) ?? value;
  }
  const exact = exactTranslations.get(normalized);
  if (exact) {
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    return `${leading}${exact}${trailing}`;
  }

  return normalizedEntries.reduce(
    (result, { expression, translated }) =>
      result.replace(
        expression,
        (_match, prefix: string) => `${prefix}${translated}`,
      ),
    value,
  );
}

function translateTextNode(node: Text, language: Language) {
  const parent = node.parentElement;
  if (
    !parent ||
    parent.closest(
      "script, style, textarea, input, pre, code, [contenteditable='true']",
    )
  ) {
    return;
  }

  const record = textRecords.get(node);
  const source =
    record && node.data === record.translated ? record.source : node.data;
  const translated = translate(source, language);
  if (node.data !== translated) node.data = translated;
  textRecords.set(node, { source, translated });
}

function translateElementAttributes(element: Element, language: Language) {
  for (const name of attributeNames) {
    if (!element.hasAttribute(name)) continue;
    const current = element.getAttribute(name) ?? "";
    let records = attributeRecords.get(element);
    if (!records) {
      records = new Map();
      attributeRecords.set(element, records);
    }
    const record = records.get(name);
    const source =
      record && current === record.translated ? record.source : current;
    const translated = translate(source, language);
    if (current !== translated) element.setAttribute(name, translated);
    records.set(name, { source, translated });
  }
}

function translateSubtree(node: Node, language: Language) {
  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text, language);
    return;
  }
  if (!(node instanceof Element)) return;
  translateElementAttributes(node, language);
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    translateTextNode(textNode as Text, language);
    textNode = walker.nextNode();
  }
  for (const child of node.querySelectorAll("*")) {
    translateElementAttributes(child, language);
  }
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(readLanguage);

  const setLanguage = useCallback((nextLanguage: Language) => {
    updateLanguage(nextLanguage);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.error("Could not save the language preference.", error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    if (!document.body) return;

    translateSubtree(document.body, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, language);
          continue;
        }
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element
        ) {
          translateElementAttributes(mutation.target, language);
          continue;
        }
        for (const addedNode of mutation.addedNodes) {
          translateSubtree(addedNode, language);
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributeNames,
    });
    return () => observer.disconnect();
  }, [language]);

  const contextValue = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }
  return context;
}
