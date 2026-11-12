import { type Language, useLanguage } from "./LanguageProvider";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const selectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
  };

  return (
    <nav
      className="fixed right-3 top-3 z-[100] inline-flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 text-sm shadow-lg backdrop-blur"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => selectLanguage("bn")}
        aria-pressed={language === "bn"}
        className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
          language === "bn"
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted"
        }`}
      >
        বাংলা
      </button>
      <span className="text-muted-foreground" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        onClick={() => selectLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
          language === "en"
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted"
        }`}
      >
        English
      </button>
    </nav>
  );
}
