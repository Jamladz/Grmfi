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
    version: "v2.4",
    closeBtn: "Close Whitepaper",
    tabs: {
      overview: "Overview",
      tokenomics: "Tokenomics",
      architecture: "Protocol",
      roadmap: "Roadmap"
    },
    overview: {
      execTitle: "Executive Summary",
      execBody: "GRMF is a decentralized Web3 financial ecosystem built on TON Blockchain. Designed to unify micro-transactions, task-based mining, wealth progression tiers, and community governance into a seamless Telegram Mini App interface.",
      multichainTitle: "Multi-Chain Ready",
      multichainBody: "Native jetton smart contracts deployed on TON with cross-chain liquidity support.",
      rankTitle: "Rank Mechanics",
      rankBody: "10-Tier wealth progression system rewarding user engagement and ongoing activity.",
      objectivesTitle: "Core Objectives",
      objectivesList: [
        "Democratize access to decentralized micro-yields",
        "Transparent reward distribution powered by smart contracts",
        "Integrated liquidity pools with automatic burn mechanisms"
      ]
    },
    tokenomics: {
      supplyTitle: "Total Supply Allocation",
      totalSupply: "1,000,000,000 GRMF",
      community: "Community & Mining Rewards",
      ecosystem: "Ecosystem & Liquidity",
      team: "Development & Team (Vested 24m)",
      marketing: "Marketing & Partnerships",
      deflationTitle: "🔥 Deflationary Mechanics",
      deflationBody: "1% of all swap transaction fees are permanently burned from total circulating supply, increasing long-term scarcity and backing value."
    },
    architecture: {
      secTitle: "Security & Proof-of-Activity",
      secBody: "The protocol uses client-server cryptographic proofs combined with zero-knowledge verification rules to prevent automated exploit bots while ensuring fast state syncing.",
      xpTitle: "XP & Wealth Tier Protocol",
      xpBody: "XP points are awarded dynamically for every validated activity (tasks, daily boxes, referrals, achievements). As total XP scales, users unlock higher wealth ranks from Poor to Master of Wealth.",
      tonTitle: "TON Connect Integration",
      tonBody: "Seamless non-custodial wallet connection through TON Connect v2 protocol, guaranteeing user ownership of on-chain Jetton assets."
    },
    roadmap: {
      p1Phase: "Phase 1 • Q3 2026",
      p1Title: "Ecosystem Launch & TGE",
      p1Body: "Telegram Mini App rollout, task mining, XP system, and community referral engine.",
      p2Phase: "Phase 2 • Q4 2026",
      p2Title: "On-Chain Jetton Mint & Staking",
      p2Body: "TON Jetton smart contract deployment, Decentralized Exchange (DEX) liquidity pools, staking vaults.",
      p3Phase: "Phase 3 • Q1 2027",
      p3Title: "CEX Listing & DAO Governance",
      p3Body: "Tier-1 Exchange listings, decentralized governance voting for rank holders, cross-chain expansion."
    }
  },
  ar: {
    title: "الورقة البيضاء الرسمية",
    subtitle: "معمارية منظومة GRMF والبروتوكول الاقتصادي",
    version: "v2.4",
    closeBtn: "إغلاق الورقة البيضاء",
    tabs: {
      overview: "نظرة عامة",
      tokenomics: "الاقتصاد الرقمي",
      architecture: "البروتوكول",
      roadmap: "خريطة الطريق"
    },
    overview: {
      execTitle: "الملخص التنفيذي",
      execBody: "مشروع GRMF هو منظومة مالية لا مركزية لمستقبل Web3 مبنية على شبكة TON. تم تصميمها لدمج المعاملات الدقيقة، التعدين عبر المهام، مستويات الثراء المتدرجة، والحوكمة المجتمعية في تطبيق تلغرام مصغر سلس ومبتكر.",
      multichainTitle: "دعم شبكات متعددة",
      multichainBody: "عقود ذكية من نوع Jetton على شبكة TON مع جسور وسيولة بين الشفرات.",
      rankTitle: "نظام الرتب والتصنيف",
      rankBody: "نظام تدرج مالي من 10 مستويات يكافئ تفاعل النشاط وبناء الثراء المستمر.",
      objectivesTitle: "الأهداف الأساسية",
      objectivesList: [
        "تمكين الوصول العادل للعياد المالية اللا مركزية الدقيقة",
        "توزيع المكافآت بصلابة وشفافية عبر العقود الذكية",
        "مجمعات سيولة مدمجة مع آليات حرق تلقائية لتعزيز قيمة الرمز"
      ]
    },
    tokenomics: {
      supplyTitle: "توزيع العرض الإجمالي",
      totalSupply: "1,000,000,000 GRMF",
      community: "مكافآت المجتمع والتعدين",
      ecosystem: "السيولة والمنظومة",
      team: "التطوير والفريق (فترة استحقاق 24 شهرًا)",
      marketing: "التسويق والشراكات",
      deflationTitle: "🔥 آليات انكماشية محفزة",
      deflationBody: "يتم حرق 1% من جميع رسوم عمليات المبادلة نهائيًا من العرض المتداول، مما يزيد الندوة ويرفع القيمة الداعمة للرمز."
    },
    architecture: {
      secTitle: "الأمان وإثبات النشاط",
      secBody: "يعتمد البروتوكول على إثباتات تشفير بين العميل والخادم وقواعد أمان موزع متقدمة لمنع البوتات الضارة وضمان تزامن آمن وسريع للبيانات.",
      xpTitle: "بروتوكول XP ومستويات الثراء",
      xpBody: "تُمنح نقاط XP ديناميكيًا لكل نشاط موثق (المهام، الصناديق اليومية، الإحالات، الإنجازات). مع زيادة XP يرتقي المستخدم من رتبة 'فقير' وصولاً إلى 'سيد الثراء'.",
      tonTitle: "ربط محفظة TON Connect",
      tonBody: "ربط غير حضاني مباشر للمحفظة عبر بروتوكول TON Connect v2 لتأكيد ملكية المستخدم المطلقة لأصول Jetton."
    },
    roadmap: {
      p1Phase: "المرحلة 1 • Q3 2026",
      p1Title: "إطلاق المنظومة و TGE",
      p1Body: "تطوير وإطلاق تطبيق التلغرام المصغر، تعدين المهام، نظام XP، ومحرك الإحالات المجتمعي.",
      p2Phase: "المرحلة 2 • Q4 2026",
      p2Title: "سك الرمز على الشبكة والتخزين",
      p2Body: "نشر العقود الذكية لرمز Jetton على TON، إنشاء مجمعات السيولة على المنصات اللا مركزية (DEX)، وصناديق Staking.",
      p3Phase: "المرحلة 3 • Q1 2027",
      p3Title: "الإدراج في المنصات وحوكمة DAO",
      p3Body: "الإدراج في منصات التداول المركزية الكبرى (CEX)، تفعيل التصويت الحوكمي لأصحاب الرتب، والتوسع بين الشبكات."
    }
  },
  ru: {
    title: "Официальная Белая Книга",
    subtitle: "Архитектура экосистемы GRMF и экономический протокол",
    version: "v2.4",
    closeBtn: "Закрыть Белую Книгу",
    tabs: {
      overview: "Обзор",
      tokenomics: "Токеномика",
      architecture: "Протокол",
      roadmap: "Дорожная карта"
    },
    overview: {
      execTitle: "Краткий обзор",
      execBody: "GRMF — это децентрализованная финансовая Web3-экосистема на блокчейне TON. Объединяет микротранзакции, майнинг за задания, системы рангов богатства и управление сообществом в удобном Telegram Mini App.",
      multichainTitle: "Мультичейн готовая",
      multichainBody: "Нативные смарт-контракты Jetton на блокчейне TON с поддержкой ликвидности.",
      rankTitle: "Механика Рангов",
      rankBody: "10-уровневая система финансового прогресса, вознаграждающая активность пользователей.",
      objectivesTitle: "Главные Цели",
      objectivesList: [
        "Демократизация доступа к децентрализованным микродоходам",
        "Прозрачное распределение наград через смарт-контракты",
        "Интегрированные пулы ликвидности с автосжиганием токенов"
      ]
    },
    tokenomics: {
      supplyTitle: "Распределение общего объема",
      totalSupply: "1 000 000 000 GRMF",
      community: "Награды сообщества и Майнинг",
      ecosystem: "Экосистема и Ликвидность",
      team: "Разработка и Команда (Вестинг 24m)",
      marketing: "Маркетинг и Партнерства",
      deflationTitle: "🔥 Дефляционная механика",
      deflationBody: "1% от всех комиссий за обмены сжигается навсегда из обращения, увеличивая дефицит и ценность токена."
    },
    architecture: {
      secTitle: "Безопасность и Proof-of-Activity",
      secBody: "Протокол использует криптографические доказательства клиент-сервер и распределенные правила проверки подлинности для защиты от ботов и обеспечения быстрой синхронизации.",
      xpTitle: "Протокол XP и Уровней Богатства",
      xpBody: "Очки XP начисляются динамически за каждое подтвержденное действие. По мере роста XP пользователи открывают ранги от «Бедного» до «Владыки Богатства».",
      tonTitle: "Интеграция TON Connect",
      tonBody: "Безопасное подключение некастодиальных кошельков через протокол TON Connect v2 для полного контроля над Jetton-активами."
    },
    roadmap: {
      p1Phase: "Фаза 1 • Q3 2026",
      p1Title: "Запуск Экосистемы и TGE",
      p1Body: "Релиз Telegram Mini App, майнинг через задания, система XP и реферальный движок.",
      p2Phase: "Фаза 2 • Q4 2026",
      p2Title: "Минт Jetton в сети и Стейкинг",
      p2Body: "Деплой смарт-контрактов Jetton на TON, пулы ликвидности DEX, стейкинг-хранилища.",
      p3Phase: "Фаза 3 • Q1 2027",
      p3Title: "Листинг на CEX и DAO Управление",
      p3Body: "Листинг на топовых биржах, голосование DAO для обладателей рангов и расширение экосистемы."
    }
  },
  fa: {
    title: "وایت‌پیپر رسمی",
    subtitle: "معماری اکوسیستم GRMF و پروتکل اقتصادی",
    version: "v2.4",
    closeBtn: "بستن وایت‌پیپر",
    tabs: {
      overview: "نگاه کلی",
      tokenomics: "توکنومیکس",
      architecture: "پروتکل",
      roadmap: "نقشه راه"
    },
    overview: {
      execTitle: "خلاصه مدیریتی",
      execBody: "پروژه GRMF یک اکوسیستم مالی غیرمتمرکز Web3 بر بستر بلاکچین TON است. این پروژه جهت یکپارچه‌سازی تراکنش‌های خرد، استخراج مبتنی بر مأموریت، سطوح ارتقای ثروت و حاکمیت جامعه در قالب تلگرام مینی‌اپ طراحی شده است.",
      multichainTitle: "پشتیبانی چندزنجیره‌ای",
      multichainBody: "قراردادهای هوشمند بومی Jetton روی بلاکچین TON با پشتیبانی از پل‌های نقدینگی.",
      rankTitle: "مکانیسم رتبه‌بندی",
      rankBody: "سیستم ۱۰ سطحی ارتقای ثروت که تعامل و فعالیت مستمر کاربران را پاداش می‌دهد.",
      objectivesTitle: "اهداف اصلی",
      objectivesList: [
        "دسترسی عادلانه به بازدهی‌های خرد غیرمتمرکز",
        "توزیع شفاف پاداش‌ها از طریق قراردادهای هوشمند",
        "استخرهای نقدینگی یکپارچه با مکانیسم توکن‌سوزی خودکار"
      ]
    },
    tokenomics: {
      supplyTitle: "توزیع کل عرضه",
      totalSupply: "۱,۰۰۰,۰۰۰,۰۰۰ GRMF",
      community: "پاداش‌های جامعه و استخراج",
      ecosystem: "اکوسیستم و نقدینگی",
      team: "توسعه و تیم (قفل ۲۴ ماهه)",
      marketing: "بازاریابی و همکاران",
      deflationTitle: "🔥 مکانیسم ضدتورمی",
      deflationBody: "۱٪ از کارمزد تمام سواپ‌ها به صورت دائمی از گردش سوزانده می‌شود تا نایابی و ارزش توکن افزایش یابد."
    },
    architecture: {
      secTitle: "امنیت و اثبات فعالیت",
      secBody: "پروتکل از اثبات‌های رمزنگاری شده کلاینت-سرور و قوانین امنیتی پیشرفته برای جلوگیری از ربات‌ها و همگام‌سازی سریع استفاده می‌کند.",
      xpTitle: "پروتکل XP و سطوح ثروت",
      xpBody: "امتیازات XP برای هر فعالیت تاییدشده اعطا می‌شود. با افزایش XP، کاربران از رتبه 'فقیر' تا 'ارباب ثروت' ارتقا می‌یابند.",
      tonTitle: "اتصال به کیف‌پول TON Connect",
      tonBody: "اتصال غیرامانی مستقیم کیف‌پول از طریق پروتکل TON Connect v2 برای تضمین مالکیت مطلق توکن‌های Jetton."
    },
    roadmap: {
      p1Phase: "فاز ۱ • Q3 2026",
      p1Title: "راه‌اندازی اکوسیستم و TGE",
      p1Body: "عرضه تلگرام مینی‌اپ، استخراج مأموریتی، سیستم XP و موتور ارجاع کاربران.",
      p2Phase: "فاز ۲ • Q4 2026",
      p2Title: "ضرب توکن روی زنجیره و استیکینگ",
      p2Body: "استقرار قرارداد هوشمند Jetton، استخرهای نقدینگی DEX و صندوق‌های استیکینگ.",
      p3Phase: "فاز ۳ • Q1 2027",
      p3Title: "لیست شدن در صرافی‌ها و حاکمیت DAO",
      p3Body: "لیست شدن در صرافی‌های بزرگ (CEX)، رای‌گیری حاکمیتی برای دارندگان رتبه و توسعه چندزنجیره‌ای."
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
          <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-1.5 rounded-2xl mb-2.5 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 px-1">
              <Languages className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[10px] uppercase tracking-wider font-black">Language</span>
            </div>

            <div className="flex items-center gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 border ${
                    lang === l.code
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs">{l.code === 'ar' ? '🇸🇦' : l.flag}</span>
                  <span>{l.label}</span>
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

