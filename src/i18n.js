import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      dashboard: "Teacher Portal Dashboard",
      sports_days: "Sports Days",
      log_out: "Log Out",
      attendance: "Attendance",
      homework: "Homework",
      report_cards: "Report Cards",
      behaviour: "Behaviour",
      events: "Events"
    }
  },
  zh: {
    translation: {
      dashboard: "教师门户仪表板",
      sports_days: "运动日",
      log_out: "登出",
      attendance: "出勤",
      homework: "家庭作业",
      report_cards: "成绩单",
      behaviour: "行为",
      events: "活动"
    }
  },
  hi: {
    translation: {
      dashboard: "शिक्षक पोर्टल डैशबोर्ड",
      sports_days: "खेल दिवस",
      log_out: "लॉग आउट",
      attendance: "उपस्थिति",
      homework: "गृहकार्य",
      report_cards: "रिपोर्ट कार्ड",
      behaviour: "व्यवहार",
      events: "कार्यक्रम"
    }
  },
  es: {
    translation: {
      dashboard: "Panel del Portal del Profesor",
      sports_days: "Días deportivos",
      log_out: "Cerrar sesión",
      attendance: "Asistencia",
      homework: "Tarea",
      report_cards: "Boletas de calificaciones",
      behaviour: "Comportamiento",
      events: "Eventos"
    }
  },
  fr: {
    translation: {
      dashboard: "Tableau de bord du portail enseignant",
      sports_days: "Journées sportives",
      log_out: "Déconnexion",
      attendance: "Présence",
      homework: "Devoirs",
      report_cards: "Bulletins scolaires",
      behaviour: "Comportement",
      events: "Événements"
    }
  },
  ar: {
    translation: {
      dashboard: "لوحة تحكم بوابة المعلم",
      sports_days: "أيام الرياضة",
      log_out: "تسجيل الخروج",
      attendance: "الحضور",
      homework: "الواجب المنزلي",
      report_cards: "بطاقات التقارير",
      behaviour: "السلوك",
      events: "الأحداث"
    }
  },
  bn: {
    translation: {
      dashboard: "শিক্ষক পোর্টাল ড্যাশবোর্ড",
      sports_days: "ক্রীড়া দিবস",
      log_out: "লগ আউট",
      attendance: "উপস্থিতি",
      homework: "হোমওয়ার্ক",
      report_cards: "রিপোর্ট কার্ড",
      behaviour: "আচরণ",
      events: "ইভেন্টসমূহ"
    }
  },
  pt: {
    translation: {
      dashboard: "Painel do Portal do Professor",
      sports_days: "Dias de Esportes",
      log_out: "Sair",
      attendance: "Frequência",
      homework: "Dever de casa",
      report_cards: "Boletins",
      behaviour: "Comportamento",
      events: "Eventos"
    }
  },
  ru: {
    translation: {
      dashboard: "Панель портала преподавателя",
      sports_days: "Спортивные дни",
      log_out: "Выйти",
      attendance: "Посещаемость",
      homework: "Домашнее задание",
      report_cards: "Табели успеваемости",
      behaviour: "Поведение",
      events: "Мероприятия"
    }
  },
  ur: {
    translation: {
      dashboard: "اساتذہ پورٹل ڈیش بورڈ",
      sports_days: "کھیلوں کے دن",
      log_out: "لاگ آؤٹ",
      attendance: "حاضری",
      homework: "ہوم ورک",
      report_cards: "رپورٹ کارڈز",
      behaviour: "رویّہ",
      events: "تقریبات"
    }
  },
  id: {
    translation: {
      dashboard: "Dasbor Portal Guru",
      sports_days: "Hari Olahraga",
      log_out: "Keluar",
      attendance: "Kehadiran",
      homework: "Pekerjaan Rumah",
      report_cards: "Rapor",
      behaviour: "Perilaku",
      events: "Acara"
    }
  },
  de: {
    translation: {
      dashboard: "Lehrerportal-Dashboard",
      sports_days: "Sporttage",
      log_out: "Abmelden",
      attendance: "Anwesenheit",
      homework: "Hausaufgaben",
      report_cards: "Zeugnisse",
      behaviour: "Verhalten",
      events: "Veranstaltungen"
    }
  },
  ja: {
    translation: {
      dashboard: "教師ポータルダッシュボード",
      sports_days: "スポーツの日",
      log_out: "ログアウト",
      attendance: "出席",
      homework: "宿題",
      report_cards: "通知表",
      behaviour: "行動",
      events: "イベント"
    }
  },
  pa: {
    translation: {
      dashboard: "ਅਧਿਆਪਕ ਪੋਰਟਲ ਡੈਸ਼ਬੋਰਡ",
      sports_days: "ਖੇਡ ਦਿਵਸ",
      log_out: "ਲੌਗ ਆਉਟ",
      attendance: "ਹਾਜ਼ਰੀ",
      homework: "ਘਰ ਦਾ ਕੰਮ",
      report_cards: "ਰਿਪੋਰਟ ਕਾਰਡ",
      behaviour: "ਵਿਵਹਾਰ",
      events: "ਸਮਾਗਮ"
    }
  },
  jv: {
    translation: {
      dashboard: "Dasbor Portal Guru",
      sports_days: "Dina Olahraga",
      log_out: "Metu",
      attendance: "Absensi",
      homework: "PR",
      report_cards: "Rapor",
      behaviour: "Tumindak",
      events: "Acara"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('seedora_lang') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;