import React, { useEffect } from 'react';

export default function LanguageSelector() {
  useEffect(() => {
    // Avoid appending the script multiple times
    if (document.getElementById('google-translate-script')) {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        try {
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'ru,en,zh,es,fr,de,ja,ar,pt,id',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
        } catch (e) {
          // Element already initialized
        }
      }
      return;
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'ru,en,zh,es,fr,de,ja,ar,pt,id',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
    };

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="flex items-center">
      <div id="google_translate_element" className="text-xs"></div>
    </div>
  );
}