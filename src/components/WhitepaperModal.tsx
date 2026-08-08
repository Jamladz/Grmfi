import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, ShieldCheck, Layers, Sparkles, Lock, Globe, Coins, Award, Languages } from 'lucide-react';

interface WhitepaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Language = 'en' | 'ar' | 'ru' | 'fa';

interface Translations {
  title: string;
  subtitle: string;
  version: string;
  closeBtn: string;
  tabs: {
    overview: string;
    tokenomics: string;
    architecture: string;
    roadmap: string;
  };
  overview: {
    execTitle: string;
    execBody: string;
    multichainTitle: string;
    multichainBody: string;
    rankTitle: string;
    rankBody: string;
    objectivesTitle: string;
    objectivesList: string[];
  };
  tokenomics: {
    supplyTitle: string;
    totalSupply: string;
    community: string;
    ecosystem: string;
    team: string;
    marketing: string;
    deflationTitle: string;
    deflationBody: string;
  };
  architecture: {
    secTitle: string;
    secBody: string;
    xpTitle: string;
    xpBody: string;
    tonTitle: string;
    tonBody: string;
  };
  roadmap: {
    p1Phase: string;
    p1Title: string;
    p1Body: string;
    p2Phase: string;
    p2Title: string;
    p2Body: string;
    p3Phase: string;
    p3Title: string;
    p3Body: string;
  };
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    title: "Official Whitepaper",
    subtitle: "GRMF Ecosystem Architecture & Economic Protocol",
    version: "v3.0",
    closeBtn: "Close Whitepaper",
    tabs: {
      overview: "Overview",
      tokenomics: "Tokenomics",
      architecture: "Protocol",
      roadmap: "Roadmap"
    },
    overview: {
      execTitle: "Executive Summary",
      execBody: "GRMF is a decentralized Web3 financial ecosystem officially listed on the TON Blockchain. Designed to unify micro-transactions, task-based mining, and wealth progression tiers into a seamless Telegram interface.",
      multichainTitle: "TON Native Assets",
      multichainBody: "Official GRMF jetton smart contracts deployed on TON Mainnet with deep liquidity and high-performance execution.",
      rankTitle: "Wealth Progression",
      rankBody: "A comprehensive 10-Tier evolution system that rewards long-term holders and active community contributors.",
      objectivesTitle: "Strategic Objectives",
      objectivesList: [
        "Full integration with TON DeFi ecosystem",
        "Transparent, contract-verified reward mechanisms",
        "Community-driven growth through active participation"
      ]
    },
    tokenomics: {
      supplyTitle: "Total Supply Allocation",
      totalSupply: "1,000,000,000 GRMF",
      community: "Mining & Airdrop Rewards",
      ecosystem: "Liquidity & Governance",
      team: "Dev & Operations (Vested)",
      marketing: "Strategic Partnerships",
      deflationTitle: "🔥 Economic Stability",
      deflationBody: "GRMF utilizes advanced liquidity management and selective burn protocols to maintain its ecosystem growth and utility."
    },
    architecture: {
      secTitle: "TON Blockchain Security",
      secBody: "Leveraging TON's high-speed sharding and PoS security to ensure instant transaction finality for all GRMF holders.",
      xpTitle: "Proof-of-Contribution",
      xpBody: "XP rewards validate real user contribution, determining access to exclusive GRMF-based financial tools and higher yield pools.",
      tonTitle: "TON Connect 2.0",
      tonBody: "Full support for non-custodial wallets like Tonkeeper and MyTonWallet, giving you total control over your GRMF assets."
    },
    roadmap: {
      p1Phase: "Phase 1 • Completed",
      p1Title: "TON Integration & TGE",
      p1Body: "Successful migration to GRMF token and official TON listing.",
      p2Phase: "Phase 2 • Q4 2026",
      p2Title: "DeFi Expansion",
      p2Body: "GRMF-based lending protocols, advanced staking vaults, and cross-chain TON bridges.",
      p3Phase: "Phase 3 • Q1 2027",
      p3Title: "Global Ecosystem",
      p3Body: "CEX Tier-1 listings, DAO governance implementation, and integration with TON Space."
    }
  },
  ar: {
    title: "الورقة البيضاء الرسمية",
    subtitle: "معمارية منظومة GRMF والبروتوكول الاقتصادي",
    version: "v3.0",
    closeBtn: "إغلاق الورقة البيضاء",
    tabs: {
      overview: "نظرة عامة",
      tokenomics: "الاقتصاد الرقمي",
      architecture: "البروتوكول",
      roadmap: "خريطة الطريق"
    },
    overview: {
      execTitle: "الملخص التنفيذي",
      execBody: "GRMF هي منظومة مالية لا مركزية (Web3) مدرجة رسميًا على شبكة TON. تم تصميمها لدمج المعاملات الدقيقة، التعدين عبر المهام، ومستويات الثراء المتدرجة في واجهة تلغرام سلسة.",
      multichainTitle: "أصول أصلية على TON",
      multichainBody: "عقود GRMF الذكية (Jetton) منشورة على شبكة TON الرئيسية مع سيولة عميقة وأداء عالٍ.",
      rankTitle: "تطور الثراء",
      rankBody: "نظام تطور من 10 مستويات يكافئ حاملي الرموز على المدى الطويل والمساهمين النشطين في المجتمع.",
      objectivesTitle: "الأهداف الاستراتيجية",
      objectivesList: [
        "التكامل الكامل مع منظومة TON DeFi",
        "آليات مكافآت شفافة وموثقة عبر العقود الذكية",
        "النمو المدفوع من المجتمع من خلال المشاركة النشطة"
      ]
    },
    tokenomics: {
      supplyTitle: "توزيع إجمالي العرض",
      totalSupply: "1,000,000,000 GRMF",
      community: "مكافآت التعدين والإنزال الجوي",
      ecosystem: "السيولة والحوكمة",
      team: "الفريق والعمليات (فترة استحقاق)",
      marketing: "الشراكات الاستراتيجية",
      deflationTitle: "🔥 الاستقرار الاقتصادي",
      deflationBody: "تستخدم GRMF إدارة سيولة متقدمة وبروتوكولات حرق انتقائية لضمان نمو المنظومة وفائدتها."
    },
    architecture: {
      secTitle: "أمان شبكة TON",
      secBody: "الاستفادة من تقنيات TON عالية السرعة وأمان PoS لضمان تأكيد فوري للمعاملات لجميع حاملي GRMF.",
      xpTitle: "إثبات المساهمة",
      xpBody: "نقاط XP ديناميكيًا لكل نشاط موثق (المهام، الصناديق اليومية، الإحالات، الإنجازات). مع زيادة XP يرتقي المستخدم في رتب الثراء داخل منظومة GRMF وصولاً إلى 'سيد الثراء'.",
      tonTitle: "تكامل TON Connect 2.0",
      tonBody: "دعم كامل للمحافظ غير الحاضنة مثل Tonkeeper، مما يمنحك تحكمًا مطلقًا في أصول GRMF الخاصة بك."
    },
    roadmap: {
      p1Phase: "المرحلة 1 • اكتملت",
      p1Title: "التكامل مع TON و TGE",
      p1Body: "الانتقال الناجح إلى رمز GRMF والإدراج الرسمي على TON.",
      p2Phase: "المرحلة 2 • Q4 2026",
      p2Title: "توسع DeFi",
      p2Body: "بروتوكولات الإقراض القائمة على GRMF، صناديق التخزين المتقدمة، وجسور TON العابرة للشبكات.",
      p3Phase: "المرحلة 3 • Q1 2027",
      p3Title: "المنظومة العالمية",
      p3Body: "الإدراج في منصات التداول المركزية (CEX)، تفعيل حوكمة DAO، والتكامل مع TON Space."
    }
  },
  ru: {
    title: "Официальная Белая Книга",
    subtitle: "Архитектура экосистемы GRMF и экономический протокол",
    version: "v3.0",
    closeBtn: "Закрыть Белую Книгу",
    tabs: {
      overview: "Обзор",
      tokenomics: "Токеномика",
      architecture: "Протокол",
      roadmap: "Дорожная карта"
    },
    overview: {
      execTitle: "Краткий обзор",
      execBody: "GRMF — это децентрализованная финансовая Web3-экосистема, официально работающая на блокчейне TON. Она объединяет микротранзакции, майнинг за задания и систему рангов в удобном интерфейсе Telegram.",
      multichainTitle: "Нативные активы TON",
      multichainBody: "Официальные смарт-контракты GRMF (Jetton) развернуты в основной сети TON с глубокой ликвидностью.",
      rankTitle: "Прогрессия Богатства",
      rankBody: "Комплексная 10-уровневая система эволюции, вознаграждающая долгосрочных держателей и активных участников сообщества.",
      objectivesTitle: "Стратегические Цели",
      objectivesList: [
        "Полная интеграция с экосистемой TON DeFi",
        "Прозрачные механизмы вознаграждения через смарт-контракты",
        "Рост, основанный на сообществе через активное участие"
      ]
    },
    tokenomics: {
      supplyTitle: "Распределение общего объема",
      totalSupply: "1 000 000 000 GRMF",
      community: "Награды за майнинг и аирдропы",
      ecosystem: "Ликвидность и управление",
      team: "Разработка и операции (Вестинг)",
      marketing: "Стратегические партнерства",
      deflationTitle: "🔥 Экономическая стабильность",
      deflationBody: "GRMF использует передовое управление ликвидностью и протоколы сжигания для поддержания роста и полезности экосистемы."
    },
    architecture: {
      secTitle: "Безопасность TON Blockchain",
      secBody: "Использование высокоскоростного шардинга и безопасности PoS сети TON для мгновенного завершения транзакций.",
      xpTitle: "Подтверждение вклада",
      xpBody: "Очки XP начисляются динамически за каждое подтвержденное действие. По мере роста XP пользователи открывают ранги от «Бедного» до «Владыки Богатства».",
      tonTitle: "TON Connect 2.0",
      tonBody: "Полная поддержка некастодиальных кошельков, таких как Tonkeeper и MyTonWallet, дающая полный контроль над вашими активами GRMF."
    },
    roadmap: {
      p1Phase: "Фаза 1 • Завершено",
      p1Title: "Интеграция TON и TGE",
      p1Body: "Успешный переход на токен GRMF и официальный листинг на TON.",
      p2Phase: "Фаза 2 • Q4 2026",
      p2Title: "Расширение DeFi",
      p2Body: "Протоколы кредитования на базе GRMF, продвинутые хранилища для стейкинга и кросс-чейн мосты TON.",
      p3Phase: "Фаза 3 • Q1 2027",
      p3Title: "Глобальная экосистема",
      p3Body: "Листинг на CEX Tier-1, внедрение управления DAO и интеграция с TON Space."
    }
  },
  fa: {
    title: "وایت‌پیپر رسمی",
    subtitle: "معماری اکوسیستم GRMF و پروتکل اقتصادی",
    version: "v3.0",
    closeBtn: "بستن وایت‌پیپر",
    tabs: {
      overview: "نگاه کلی",
      tokenomics: "توکنومیکس",
      architecture: "پروتکل",
      roadmap: "نقشه راه"
    },
    overview: {
      execTitle: "خلاصه مدیریتی",
      execBody: "پروژه GRMF یک اکوسیستم مالی غیرمتمرکز Web3 بر بستر بلاکچین TON است. این پروژه جهت یکپارچه‌سازی تراکنش‌های خرد، استخراج مبتنی بر مأموریت و سطوح ارتقای ثروت طراحی شده است.",
      multichainTitle: "دارایی‌های بومی TON",
      multichainBody: "قراردادهای هوشمند GRMF (Jetton) روی شبکه اصلی TON با نقدینگی عمیق مستقر شده‌اند.",
      rankTitle: "مکانیسم رتبه‌بندی",
      rankBody: "سیستم ۱۰ سطحی ارتقای ثروت که تعامل و فعالیت مستمر کاربران را پاداش می‌دهد.",
      objectivesTitle: "اهداف اصلی",
      objectivesList: [
        "یکپارچگی کامل با اکوسیستم TON DeFi",
        "توزیع شفاف پاداش‌ها از طریق قراردادهای هوشمند",
        "رشد جامعه محور از طریق مشارکت فعال"
      ]
    },
    tokenomics: {
      supplyTitle: "توزیع کل عرضه",
      totalSupply: "۱,۰۰۰,۰۰۰,۰۰۰ GRMF",
      community: "پاداش‌های جامعه و استخراج",
      ecosystem: "اکوسیستم و نقدینگی",
      team: "توسعه و تیم (دوره واگذاری)",
      marketing: "بازاریابی و همکاران",
      deflationTitle: "🔥 پایداری اقتصادی",
      deflationBody: "GRMF از مدیریت نقدینگی پیشرفته و پروتکل‌های توکن‌سوزی انتخابی برای حفظ رشد و کارایی اکوسیستم استفاده می‌کند."
    },
    architecture: {
      secTitle: "امنیت بلاکچین TON",
      secBody: "استفاده از سرعت بالا و امنیت PoS شبکه TON برای تضمین نهایی شدن فوری تراکنش‌ها.",
      xpTitle: "پروتکل XP و سطوح ثروت",
      xpBody: "امتیازات XP برای هر فعالیت تاییدشده اعطا می‌شود. با افزایش XP، کاربران از رتبه 'فقير' تا 'ارباب ثروت' ارتقا می‌يابند.",
      tonTitle: "اتصال TON Connect 2.0",
      tonBody: "پشتیبانی کامل از کیف‌پول‌های غیرامانی مانند Tonkeeper، که به شما کنترل مطلق روی دارایی‌های GRMF می‌دهد."
    },
    roadmap: {
      p1Phase: "فاز ۱ • تکمیل شده",
      p1Title: "یکپارچگی TON و TGE",
      p1Body: "انتقال موفق به توکن GRMF و لیست شدن رسمی در TON.",
      p2Phase: "فاز ۲ • Q4 2026",
      p2Title: "توسعه DeFi",
      p2Body: "پروتکل‌های وام‌دهی مبتنی بر GRMF، صندوق‌های استیکینگ پیشرفته و پل‌های TON.",
      p3Phase: "فاز ۳ • Q1 2027",
      p3Title: "اکوسیستم جهانی",
      p3Body: "لیست شدن در صرافی‌های تراز اول (CEX)، اجرای حاکمیت DAO و یکپارچگی با TON Space."
    }
  }
};

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' }
];

export const WhitepaperModal: React.FC<WhitepaperModalProps> = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'overview' | 'tokenomics' | 'roadmap' | 'architecture'>('overview');

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar' || lang === 'fa';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          dir={isRtl ? 'rtl' : 'ltr'}
          className="w-full max-w-lg bg-white rounded-t-[36px] sm:rounded-[36px] p-5 pb-6 text-slate-900 shadow-2xl relative overflow-hidden border-t sm:border border-amber-200/60 h-[80vh] max-h-[80vh] flex flex-col justify-between"
        >
          {/* Top Pull Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2 shrink-0" />

          {/* Language Selector Toolbar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-1 rounded-xl mb-2.5 shrink-0 gap-1">
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 px-1 shrink-0">
              <Languages className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline uppercase tracking-wider text-[9px]">Lang</span>
            </div>

            <div className="grid grid-cols-4 gap-1 flex-1 min-w-0">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`py-1 px-1 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1 border text-center whitespace-nowrap min-w-0 ${
                    lang === l.code
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] leading-none shrink-0">{l.code === 'ar' ? '🇸🇦' : l.flag}</span>
                  <span className="truncate">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 p-0.5 shadow-md shrink-0">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-amber-600">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                    {t.title}
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                    {t.version}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                  {t.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all shrink-0 ms-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl my-2.5 shrink-0 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabs.overview}
            </button>
            <button
              onClick={() => setActiveTab('tokenomics')}
              className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                activeTab === 'tokenomics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabs.tokenomics}
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                activeTab === 'architecture'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabs.architecture}
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                activeTab === 'roadmap'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabs.roadmap}
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-slate-700 my-1">
            {activeTab === 'overview' && (
              <motion.div key={`overview-${lang}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" /> {t.overview.execTitle}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {t.overview.execBody}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mb-1">
                      <Globe className="w-3.5 h-3.5 shrink-0" /> {t.overview.multichainTitle}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {t.overview.multichainBody}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs mb-1">
                      <Award className="w-3.5 h-3.5 shrink-0" /> {t.overview.rankTitle}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {t.overview.rankBody}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/70 text-amber-900">
                  <h4 className="text-xs font-black uppercase tracking-wide mb-1.5">{t.overview.objectivesTitle}</h4>
                  <ul className="text-[11px] space-y-1 list-disc list-inside font-medium text-amber-800">
                    {t.overview.objectivesList.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'tokenomics' && (
              <motion.div key={`tokenomics-${lang}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-500 shrink-0" /> {t.tokenomics.supplyTitle}
                    </span>
                    <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {t.tokenomics.totalSupply}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between font-bold text-[11px] mb-1">
                        <span>{t.tokenomics.community}</span>
                        <span className="text-emerald-600 font-black">50%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[50%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-[11px] mb-1">
                        <span>{t.tokenomics.ecosystem}</span>
                        <span className="text-indigo-600 font-black">25%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full w-[25%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-[11px] mb-1">
                        <span>{t.tokenomics.team}</span>
                        <span className="text-amber-600 font-black">15%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[15%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-[11px] mb-1">
                        <span>{t.tokenomics.marketing}</span>
                        <span className="text-rose-600 font-black">10%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full w-[10%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/60">
                  <span className="text-xs font-black text-indigo-900 uppercase tracking-wider block mb-1">
                    {t.tokenomics.deflationTitle}
                  </span>
                  <p className="text-[11px] text-indigo-800/90 leading-relaxed font-medium">
                    {t.tokenomics.deflationBody}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'architecture' && (
              <motion.div key={`architecture-${lang}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.architecture.secTitle}</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {t.architecture.secBody}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.architecture.xpTitle}</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {t.architecture.xpBody}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.architecture.tonTitle}</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {t.architecture.tonBody}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'roadmap' && (
              <motion.div key={`roadmap-${lang}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className={`relative ${isRtl ? 'border-r-2 mr-3 pr-4' : 'border-l-2 ml-3 pl-4'} border-amber-300 space-y-4 my-2`}>
                  <div className="relative">
                    <div className={`absolute ${isRtl ? '-right-[21px]' : '-left-[21px]'} top-0 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100`} />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block mb-0.5">{t.roadmap.p1Phase}</span>
                    <h4 className="text-xs font-black text-slate-900">{t.roadmap.p1Title}</h4>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-0.5">{t.roadmap.p1Body}</p>
                  </div>

                  <div className="relative">
                    <div className={`absolute ${isRtl ? '-right-[21px]' : '-left-[21px]'} top-0 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-100`} />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-0.5">{t.roadmap.p2Phase}</span>
                    <h4 className="text-xs font-black text-slate-900">{t.roadmap.p2Title}</h4>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-0.5">{t.roadmap.p2Body}</p>
                  </div>

                  <div className="relative">
                    <div className={`absolute ${isRtl ? '-right-[21px]' : '-left-[21px]'} top-0 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100`} />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-0.5">{t.roadmap.p3Phase}</span>
                    <h4 className="text-xs font-black text-slate-900">{t.roadmap.p3Title}</h4>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-0.5">{t.roadmap.p3Body}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Action */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest transition-all shrink-0 mt-2 active:scale-[0.98]"
          >
            {t.closeBtn}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

