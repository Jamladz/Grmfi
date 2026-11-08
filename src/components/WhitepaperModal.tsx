import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  ShieldCheck,
  Layers,
  Sparkles,
  Lock,
  Globe,
  Coins,
  Award,
  Languages,
  Flame,
  Calculator,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  TrendingUp,
  Cpu,
  Zap,
  Rocket,
  ArrowUpRight,
  Scale
} from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface WhitepaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Language = 'ar' | 'en' | 'ru' | 'fa';
type TabKey = 'overview' | 'tokenomics' | 'airdrop' | 'architecture' | 'roadmap';

const TREASURY_ADDRESS = 'UQAJcp9v_CqgdqHmAjs8sZRs0UPkQgZBuWct2AfMBJfgP6QS';

interface PoolAllocation {
  name: string;
  pct: number;
  tokens: string;
  tgeUnlock: string;
  vesting: string;
  color: string;
  badgeClass: string;
}

interface BoosterSpec {
  name: string;
  cost: string;
  boost: string;
  instantGrmf: string;
  tgeRule: string;
}

interface RoadmapPhase {
  phase: string;
  period: string;
  status: 'completed' | 'active' | 'upcoming';
  statusText: string;
  progress: number;
  title: string;
  items: string[];
}

interface WhitepaperTranslation {
  title: string;
  subtitle: string;
  version: string;
  auditBadge: string;
  closeBtn: string;
  treasuryLabel: string;
  copiedText: string;
  tabs: {
    overview: string;
    tokenomics: string;
    airdrop: string;
    architecture: string;
    roadmap: string;
  };
  kpis: {
    supplyLabel: string;
    supplyValue: string;
    standardLabel: string;
    standardValue: string;
    presaleLabel: string;
    presaleValue: string;
    tgeLabel: string;
    tgeValue: string;
  };
  overview: {
    execTag: string;
    execTitle: string;
    execBody: string;
    problemTitle: string;
    problemBody: string;
    solutionTitle: string;
    solutionBody: string;
    pillarsHeader: string;
    pillars: {
      title: string;
      tag: string;
      desc: string;
    }[];
    objectivesTitle: string;
    objectivesList: string[];
  };
  tokenomics: {
    headerTitle: string;
    headerSub: string;
    totalSupplyBadge: string;
    tgeLabel: string;
    vestingLabel: string;
    pools: PoolAllocation[];
    revenueTitle: string;
    revenueSub: string;
    revenueSplits: {
      label: string;
      pct: string;
      desc: string;
    }[];
  };
  airdrop: {
    formulaTitle: string;
    formulaSub: string;
    formulaNote: string;
    weightsTitle: string;
    weights: {
      metric: string;
      weight: string;
      note: string;
    }[];
    simTitle: string;
    simSub: string;
    simBalanceLabel: string;
    simRefsLabel: string;
    simBoosterLabel: string;
    simResultLabel: string;
    simMultiplierLabel: string;
    boostersTitle: string;
    boosters: BoosterSpec[];
  };
  architecture: {
    specsTitle: string;
    specs: {
      label: string;
      value: string;
    }[];
    layersTitle: string;
    layers: {
      title: string;
      badge: string;
      body: string;
    }[];
    ranksTitle: string;
    ranksBody: string;
  };
  roadmap: {
    headerTitle: string;
    headerSub: string;
    phases: RoadmapPhase[];
  };
}

const TRANSLATIONS: Record<Language, WhitepaperTranslation> = {
  ar: {
    title: 'الورقة البيضاء الرسمية',
    subtitle: 'المعمارية التقنية والبروتوكول الاقتصادي لمنظومة GRMF Fi على شبكة TON',
    version: 'الإصدار v3.2',
    auditBadge: 'موثق على TON Mainnet',
    closeBtn: 'إغلاق الورقة البيضاء',
    treasuryLabel: 'عقد خزينة البروتوكول الرسمي (TON)',
    copiedText: 'تم النسخ',
    tabs: {
      overview: 'الرؤية والملخص',
      tokenomics: 'الاقتصاد الرمزي',
      airdrop: 'معادلة التوزيع',
      architecture: 'المعمارية والأمان',
      roadmap: 'خريطة الطريق'
    },
    kpis: {
      supplyLabel: 'إجمالي العرض الثابت',
      supplyValue: '100,000,000 GRMF',
      standardLabel: 'معيار الشبكة',
      standardValue: 'TON Jetton (TEP-74)',
      presaleLabel: 'سعر البيع المسبق',
      presaleValue: '1 TON = 500 GRMF',
      tgeLabel: 'موعد الإدراج و TGE',
      tgeValue: '31 ديسمبر 2026'
    },
    overview: {
      execTag: 'الملخص التنفيذي للبروتوكول',
      execTitle: 'الجيل الجديد من التمويل اللامركزي التفاعلي داخل تلغرام',
      execBody:
        'يمثل بروتوكول GRMF Fi بنية تحتية مالية متكاملة من الجيل الثالث (Web3 DeFi) مبنية خصيصاً لمنظومة Telegram Mini Apps وشبكة TON Blockchain. يدمج البروتوكول بين محرك المبادلة الآلي (AMM Swap)، ونظام إثبات المساهمة (Proof-of-Contribution)، وآليات تعزيز السيولة الحقيقية لحل مشكلة التضخم التي عانت منها تطبيقات التعدين التقليدية.',
      problemTitle: 'التحدي في التطبيقات التقليدية',
      problemBody:
        'معظم تطبيقات النقر والتعدين السابقة اعتمدت على توزيع عشوائي بدون سيولة حقيقية أو فائدة اقتصادية للرمز، مما أدى إلى انهيار الأسعار فور الإدراج وسيطرة حسابات البوتات الوهمية.',
      solutionTitle: 'الحل الهندسي في GRMF Fi',
      solutionBody:
        'ربط كل مكافأة بنشاط حقيقي موثق (مهام يومية متجددة كل 24 ساعة، مهمات مبادلة DEX لمرة واحدة، وتوثيق المحفظة عبر TON Connect) مع توجيه إيرادات البروتوكول مباشرة لدعم مجمع السيولة والحرق الذاتي.',
      pillarsHeader: 'الركائز الاقتصادية الثلاث لمنظومة GRMF Fi',
      pillars: [
        {
          title: 'محرك المبادلة اللامركزي (DEX Swap Engine)',
          tag: '0.30% LP Fee',
          desc: 'دعم المبادلة الفورية بين GRMF وأبرز عملات منظومة تون (GRAM, USDT, NOT, DOGS, HMSTR) مع مهمات إنجاز دائمة تُكمل مرة واحدة لكل زوج عملات.'
        },
        {
          title: 'بروتوكول المهام اليومية وإثبات النشاط (24h PoC)',
          tag: '0.05 TON Check-In',
          desc: 'دورة مهام ذكية تتجدد كل 24 ساعة بدقة تشمل تسجيل الدخول اليومي على السلسلة (0.05 TON مقابل +100 GRMF) وصندوق المفاجآت اليومي (+35 GRMF).'
        },
        {
          title: 'هرم الثراء ذو الـ 10 مستويات (Wealth Hierarchy)',
          tag: 'Level 1 → Level 10',
          desc: 'نظام ترقية تراكمي يبدأ من رتبة "فقير" وصولاً إلى "سيد الثراء" بناءً على نقاط الخبرة (XP)، ويرفع الوزن النسبي للمحفظة عند لقطة التوزيع النهائية.'
        }
      ],
      objectivesTitle: 'الضمانات الاستراتيجية لحاملي العملة',
      objectivesList: [
        'عرض أقصى ثابت تماماً عند 100 مليون عملة GRMF مع إلغاء صلاحية سك عملات إضافية.',
        'تداول مبكر حصري للمشاركين في البيع المسبق على منصة STON.fi قبل فتح التوزيع العام.',
        'حماية صارمة ضد الهجمات الوهمية (Anti-Sybil) عبر التحقق من المحافظ النشطة على شبكة TON.'
      ]
    },
    tokenomics: {
      headerTitle: 'هيكلة توزيع العملة وجداول الاستحقاق (Vesting)',
      headerSub: 'تم تصميم الاقتصاد الرمزي لضمان سيولة عميقة عند الإدراج ومنع أي ضغط بيعي مفاجئ.',
      totalSupplyBadge: '100,000,000 GRMF (100%)',
      tgeLabel: 'فك القفل عند TGE',
      vestingLabel: 'جدول الاستحقاق',
      pools: [
        {
          name: 'مكافآت المجتمع والإنزال الجوي (Airdrop & Mining)',
          pct: 45,
          tokens: '45,000,000 GRMF',
          tgeUnlock: 'حتى 100% لحاملي المعززات',
          vesting: 'توزيع مرحلي على 3 أشهر للحسابات المجانية، وفوري 100% لحاملي معززات التخصيص.',
          color: 'bg-emerald-500',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        {
          name: 'مجمعات السيولة اللامركزية وعوائد التخزين (DEX LP)',
          pct: 25,
          tokens: '25,000,000 GRMF',
          tgeUnlock: '100% مخصص للسيولة',
          vesting: 'مقفلة بالكامل في عقود STON.fi و DeDust لمدة 24 شهراً لضمان عمق السعر.',
          color: 'bg-[#0088CC]',
          badgeClass: 'bg-sky-50 text-[#0088CC] border-sky-200'
        },
        {
          name: 'التطوير الأساسي والأمن السيبراني (Core Team)',
          pct: 15,
          tokens: '15,000,000 GRMF',
          tgeUnlock: '0% عند الإدراج',
          vesting: 'فترة تجميد كاملة (Cliff) لمدة 6 أشهر، يتبعها استحقاق خطي شهري على مدار 24 شهراً.',
          color: 'bg-indigo-500',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        },
        {
          name: 'صندوق المنظومة والإدراج في المنصات المركزية (CEX)',
          pct: 10,
          tokens: '10,000,000 GRMF',
          tgeUnlock: '20% لصناعة السوق',
          vesting: 'مخصص لرسوم الإدراج في منصات الفئة الأولى (Tier-1 CEX) والشراكات الإعلانية الكبرى.',
          color: 'bg-amber-500',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          name: 'البيع المسبق الاستراتيجي (Public Presale Pool)',
          pct: 5,
          tokens: '5,000,000 GRMF',
          tgeUnlock: '100% بدون قيود',
          vesting: 'سعر ثابت (1 TON = 500 GRMF) مع ميزة التداول المبكر الحصري على STON.fi.',
          color: 'bg-rose-500',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
        }
      ],
      revenueTitle: 'آلية الانكماش وإعادة الشراء والحرق (Buyback & Burn)',
      revenueSub: 'يتم توجيه كافة عوائد معاملات TON داخل البروتوكول آلياً وفق النسب التالية:',
      revenueSplits: [
        {
          label: 'دعم مجمع السيولة (STON.fi LP)',
          pct: '45%',
          desc: 'تُضخ مباشرة كسيولة مقابلة لعملة GRMF لرفع السعر الأدنى (Floor Price) باستمرار.'
        },
        {
          label: 'صندوق إعادة الشراء والحرق الذاتي',
          pct: '35%',
          desc: 'شراء عملات GRMF من السوق المفتوح وإرسالها إلى عنوان الحرق الصفري لتقليل المعروض.'
        },
        {
          label: 'البنية التحتية وتدقيق العقود الذكية',
          pct: '20%',
          desc: 'تمويل خوادم المزامنة الفورية، تدقيق الأمان، وجوائز المسابقات المجتمعية.'
        }
      ]
    },
    airdrop: {
      formulaTitle: 'المعادلة الرياضية لتوزيع الإنزال الجوي (Airdrop Formula)',
      formulaSub: 'يعتمد البروتوكول خوارزمية شفافة متعددة العوامل لحساب الحصة النهائية لكل محفظة:',
      formulaNote: 'حيث يمثل معامل المضاعفة (M_Boost) مجموع المعززات المفعلة على المحفظة ويصل حتى 6.5x كحد أقصى.',
      weightsTitle: 'جدول أوزان النقاط الأساسية',
      weights: [
        { metric: 'الرصيد الفعلي والمكتسب (GRMF Balance)', weight: '1.0x لكل عملة', note: 'يشمل رصيد المهام، الصناديق، والمبادلات' },
        { metric: 'نقاط الخبرة والنشاط (Total XP)', weight: '1.5 نقطة / XP', note: 'تُكتسب من إتمام المهام والترقي في الرتب' },
        { metric: 'الإحالات الموثقة (Verified Referrals)', weight: '+250 نقطة / صديق', note: 'تُحتسب الإحالات الحقيقية المرتبطة بتلغرام' },
        { metric: 'المهام المنجزة (Completed Quests)', weight: '+120 نقطة / مهمة', note: 'تشمل مهام الشركاء ومهمات الـ Swap الخمس' },
        { metric: 'رتبة الثراء (Wealth Rank Level)', weight: '+300 نقطة / مستوى', note: 'من المستوى 1 حتى المستوى 10' }
      ],
      simTitle: 'محاكي التوزيع التفاعلي (Live Allocation Simulator)',
      simSub: 'جرّب تغيير المعطيات أدناه لمعاينة تأثير المعززات على حصتك المتوقعة عند التوزيع:',
      simBalanceLabel: 'رصيد GRMF المتوقع',
      simRefsLabel: 'عدد الإحالات النشطة',
      simBoosterLabel: 'معزز التوزيع (Booster Pass)',
      simResultLabel: 'إجمالي نقاط التخصيص النهائية',
      simMultiplierLabel: 'معامل المضاعفة النشط',
      boostersTitle: 'مواصفات بطاقات تعزيز التوزيع الرسمية',
      boosters: [
        {
          name: 'On-Chain Verification Pass',
          cost: '0.5 TON',
          boost: '+25% (1.25x)',
          instantGrmf: '+1,500 GRMF',
          tgeRule: 'توثيق المحفظة ضد الحظر (Anti-Sybil) وأولوية السحب'
        },
        {
          name: 'Turbo Allocation Booster',
          cost: '1.5 TON',
          boost: '+75% (1.75x)',
          instantGrmf: '+5,000 GRMF',
          tgeRule: 'إلغاء فترة القفل (100% فك فوري عند TGE)'
        },
        {
          name: 'Whale Pool Priority Pass',
          cost: '3.0 TON',
          boost: '+150% (2.50x)',
          instantGrmf: '+12,000 GRMF',
          tgeRule: 'دخول مباشر في مجمع الحيتان (Whale Pool Tier-1)'
        },
        {
          name: 'Genesis VIP Multiplier Node',
          cost: '5.0 TON',
          boost: '+300% (4.00x)',
          instantGrmf: '+25,000 GRMF',
          tgeRule: 'أقصى مضاعفة + سحب مبكر قبل الإدراج العام بـ 24 ساعة'
        }
      ]
    },
    architecture: {
      specsTitle: 'المواصفات التقنية للبروتوكول (Technical Stack)',
      specs: [
        { label: 'شبكة البلوكشين الأساسية', value: 'TON Mainnet (The Open Network)' },
        { label: 'معيار العقد الذكي للعملة', value: 'TEP-74 Jetton & TEP-64 Metadata' },
        { label: 'بروتوكول ربط المحافظ', value: 'TON Connect 2.0 (Non-Custodial)' },
        { label: 'سرعة تسوية المعاملات', value: '< 3.5 ثانية عبر التقسيم الديناميكي (Sharding)' },
        { label: 'دورة تجديد المهام اليومية', value: '86,400 ثانية (24 ساعة حتمية)' },
        { label: 'حالة صلاحية سك العملات (Mint)', value: 'مغلقة نهائياً بعد الإصدار الأولي (Fixed Cap)' }
      ],
      layersTitle: 'طبقات الحماية والأمان الثلاث (Security Matrix)',
      layers: [
        {
          title: '1. أمان العقود الذكية وعدم القابلية للتغيير',
          badge: 'Immutable Jetton',
          body: 'تم تصميم عقد GRMF وفق معيار TEP-74 القياسي بدون أي دوال خفية لتجميد الأرصدة أو فرض ضرائب بيع تعسفية، مع التنازل الكامل عن صلاحية إصدار عملات إضافية.'
        },
        {
          title: '2. حماية السيولة عبر القفل الزمني المشفر',
          badge: '24-Month LP Lock',
          body: 'يتم قفل رموز مزود السيولة (LP Tokens) الخاصة بأزواج GRMF/TON و GRMF/USDT على منصة STON.fi لمدة 24 شهراً كاملة عبر عقد زمني غير قابل للكسر.'
        },
        {
          title: '3. نظام مكافحة البوتات والتلاعب (Anti-Sybil Engine)',
          badge: 'Zero-Bot Policy',
          body: 'تتم فلترة الحسابات الوهمية عبر مطابقة معرف تلغرام الحقيقي، بصمة النشاط الزمني، وتوقيعات المحفظة على شبكة TON لضمان ذهاب التوزيع للمجتمع الحقيقي فقط.'
        }
      ],
      ranksTitle: 'معمارية رتب الثراء العشر (10-Tier Wealth Architecture)',
      ranksBody:
        'تبدأ رحلة المستخدم من المستوى 1 (فقير - 0 XP) وتتدرج عبر (كادح، عامل، مدخر، تاجر، مستثمر، رجل أعمال، بارون، تايكون) وصولاً إلى المستوى 10 (سيد الثراء - 20,000+ XP) الذي يمنح أعلى وزن نسبي في مجمعات المكافآت.'
    },
    roadmap: {
      headerTitle: 'خريطة الطريق التنفيذية (2026 – 2027)',
      headerSub: 'خطة عمل مرحلية واضحة المعالم ومرتبطة بمؤشرات إنجاز تقنية قابلة للتحقق.',
      phases: [
        {
          phase: 'المرحلة الأولى • Q3 2026',
          period: 'مكتملة 100%',
          status: 'completed',
          statusText: 'تم الإنجاز بنجاح',
          progress: 100,
          title: 'تأسيس البنية التحتية وإطلاق التطبيق المصغر',
          items: [
            'إطلاق واجهة GRMF Fi بوضع الشاشة الكاملة الرسمي لتلغرام (Fullscreen WebApp).',
            'تطوير محرك المبادلة (Swap) لـ 6 عملات رئيسية مع رسوم بيانية حية.',
            'بناء نظام رتب الثراء (10 مستويات) ونظام الإحالات الموثق.',
            'دمج بروتوكول TON Connect 2.0 لدعم محافظ Tonkeeper و Telegram Wallet.'
          ]
        },
        {
          phase: 'المرحلة الثانية • Q4 2026',
          period: 'جارية الآن (85%)',
          status: 'active',
          statusText: 'المرحلة النشطة حالياً',
          progress: 85,
          title: 'البيع المسبق، معززات التوزيع، وتوسيع الشراكات',
          items: [
            'إطلاق البيع المسبق العام (5,000,000 GRMF) بسعر ثابت 1 TON = 500 GRMF.',
            'تفعيل بطاقات مضاعفة الإنزال الجوي (Boosters) ومهمة التسجيل اليومي على السلسلة (0.05 TON).',
            'تفعيل مهمات المبادلة الخمس لمرة واحدة وشراكات البوتات الإقليمية والعالمية.',
            'إجراء التدقيق النهائي لقوائم المحافظ المؤهلة قبل لقطة الشاشة (Snapshot).'
          ]
        },
        {
          phase: 'المرحلة الثالثة • 31 ديسمبر 2026',
          period: 'حدث TGE الرسمي',
          status: 'upcoming',
          statusText: 'الحدث القادم',
          progress: 30,
          title: 'إصدار العملة (TGE) والإدراج في المنصات اللامركزية',
          items: [
            'التوزيع الرسمي لعملات GRMF على المحافظ الموثقة عبر بوابة المطالبة الفورية.',
            'إطلاق مجمعات السيولة الرسمية GRMF/TON و GRMF/USDT على منصة STON.fi و DeDust.io.',
            'فتح التداول المبكر الحصري للمشاركين في البيع المسبق وحاملي عقدة Genesis VIP.',
            'تفعيل آلية إعادة الشراء والحرق التلقائي من رسوم التداول.'
          ]
        },
        {
          phase: 'المرحلة الرابعة • Q1–Q2 2027',
          period: 'التوسع العالمي',
          status: 'upcoming',
          statusText: 'مخطط مستقبلي',
          progress: 10,
          title: 'الإدراج في المنصات المركزية (CEX) وحوكمة DAO',
          items: [
            'إدراج عملة GRMF في منصات التداول المركزية الكبرى (Tier-1 & Tier-2 CEX).',
            'إطلاق خزائن التخزين الذكي (GRMF Staking Vaults) بعوائد سنوية مركبة.',
            'تفعيل حوكمة المجتمع اللامركزية (GRMF DAO) للتصويت على مقترحات التطوير.',
            'بناء جسر السيولة العابر للشبكات (Cross-Chain Bridge) لربط TON مع شبكات EVM.'
          ]
        }
      ]
    }
  },
  en: {
    title: 'Official Whitepaper',
    subtitle: 'Technical Architecture & Economic Protocol of GRMF Fi on TON Blockchain',
    version: 'v3.2 Paper',
    auditBadge: 'TON Mainnet Verified',
    closeBtn: 'Close Whitepaper',
    treasuryLabel: 'Official Protocol Treasury Contract (TON)',
    copiedText: 'Copied',
    tabs: {
      overview: 'Overview',
      tokenomics: 'Tokenomics',
      airdrop: 'Airdrop Math',
      architecture: 'Architecture',
      roadmap: 'Roadmap'
    },
    kpis: {
      supplyLabel: 'Fixed Total Supply',
      supplyValue: '100,000,000 GRMF',
      standardLabel: 'Token Standard',
      standardValue: 'TON Jetton (TEP-74)',
      presaleLabel: 'Presale Valuation',
      presaleValue: '1 TON = 500 GRMF',
      tgeLabel: 'Official TGE Date',
      tgeValue: 'Dec 31, 2026'
    },
    overview: {
      execTag: 'Executive Protocol Summary',
      execTitle: 'Next-Generation Interactive DeFi Native to Telegram & TON',
      execBody:
        'GRMF Fi is an institutional-grade Web3 financial protocol engineered for the Telegram Mini-App ecosystem on the TON Blockchain. By combining an Automated Market Maker (AMM) Swap interface, deterministic Proof-of-Contribution (PoC) missions, and on-chain liquidity backing, GRMF Fi eliminates the hyper-inflation flaws of legacy tap-to-earn apps.',
      problemTitle: 'The Legacy Mini-App Flaw',
      problemBody:
        'First-generation Telegram mining apps relied on unbacked token emissions with zero utility or liquidity depth, resulting in severe post-TGE sell-offs and Sybil bot farm dominance.',
      solutionTitle: 'The GRMF Fi Engineering Solution',
      solutionBody:
        'Every reward is anchored to verified user actions (24h recurring missions, one-time DEX swap milestones, and TON Connect cryptographic verification) while routing protocol TON revenues into LP depth and token burns.',
      pillarsHeader: 'Three Core Pillars of the GRMF Fi Ecosystem',
      pillars: [
        {
          title: 'Multi-Asset DEX Swap Engine',
          tag: '0.30% LP Fee',
          desc: 'Seamless token swapping between GRMF and premier TON assets (GRAM, USDT, NOT, DOGS, HMSTR) paired with permanent one-time Swap Missions.'
        },
        {
          title: '24-Hour Proof-of-Contribution Engine',
          tag: '0.05 TON Check-In',
          desc: 'Deterministic 24-hour renewal cycle featuring the On-Chain Daily Check-In (0.05 TON for +100 GRMF) and Daily Mystery Box (+35 GRMF).'
        },
        {
          title: '10-Tier Wealth Progression Hierarchy',
          tag: 'Level 1 → Level 10',
          desc: 'Cumulative XP progression from Level 1 (Poor) to Level 10 (Master of Wealth) that directly amplifies a user’s snapshot allocation weight.'
        }
      ],
      objectivesTitle: 'Strategic Holder Guarantees',
      objectivesList: [
        'Strictly capped supply of 100,000,000 GRMF with minting authority permanently revoked post-genesis.',
        'Exclusive early trading access on STON.fi DEX for Presale participants prior to public distribution.',
        'Hardware-grade Anti-Sybil filtering via on-chain TON Connect wallet verification.'
      ]
    },
    tokenomics: {
      headerTitle: 'Supply Allocation & Institutional Vesting Schedule',
      headerSub: 'Engineered to guarantee deep DEX liquidity at launch and prevent sudden sell pressure.',
      totalSupplyBadge: '100,000,000 GRMF (100%)',
      tgeLabel: 'TGE Unlock',
      vestingLabel: 'Vesting Terms',
      pools: [
        {
          name: 'Community Mining & Airdrop Pool',
          pct: 45,
          tokens: '45,000,000 GRMF',
          tgeUnlock: 'Up to 100% w/ Boosters',
          vesting: '3-month phased release for standard accounts; 100% instant TGE unlock for Booster holders.',
          color: 'bg-emerald-500',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        {
          name: 'DEX Liquidity & Staking Reserves',
          pct: 25,
          tokens: '25,000,000 GRMF',
          tgeUnlock: '100% LP Locked',
          vesting: '100% deployed into STON.fi & DeDust pools with a 24-month cryptographic LP time-lock.',
          color: 'bg-[#0088CC]',
          badgeClass: 'bg-sky-50 text-[#0088CC] border-sky-200'
        },
        {
          name: 'Core Development & Security Audit',
          pct: 15,
          tokens: '15,000,000 GRMF',
          tgeUnlock: '0% at TGE',
          vesting: 'Strict 6-month cliff followed by 24-month linear smart-contract vesting.',
          color: 'bg-indigo-500',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        },
        {
          name: 'Ecosystem Grants & Tier-1 CEX Listings',
          pct: 10,
          tokens: '10,000,000 GRMF',
          tgeUnlock: '20% Market Making',
          vesting: 'Reserved for CEX market-making liquidity, institutional partnerships, and cross-app growth.',
          color: 'bg-amber-500',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          name: 'Strategic Public Presale Pool',
          pct: 5,
          tokens: '5,000,000 GRMF',
          tgeUnlock: '100% Unlocked',
          vesting: 'Fixed rate (1 TON = 500 GRMF) with exclusive early trading privileges on STON.fi.',
          color: 'bg-rose-500',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
        }
      ],
      revenueTitle: 'Deflationary Buyback & Burn Treasury Engine',
      revenueSub: 'All protocol TON revenues from check-ins and boosters are routed automatically:',
      revenueSplits: [
        {
          label: 'STON.fi Liquidity Pool Backing',
          pct: '45%',
          desc: 'Injected directly into the GRMF/TON liquidity pool to continuously strengthen the token floor price.'
        },
        {
          label: 'Automated Buyback & Burn Vault',
          pct: '35%',
          desc: 'Repurchases GRMF from open DEX markets and sends tokens to the null burn address.'
        },
        {
          label: 'Core Infrastructure & Security',
          pct: '20%',
          desc: 'Funds high-availability nodes, smart contract security audits, and community reward pools.'
        }
      ]
    },
    airdrop: {
      formulaTitle: 'Quantitative Airdrop Allocation Formula',
      formulaSub: 'The protocol executes a deterministic multi-factor equation to compute each wallet’s final TGE share:',
      formulaNote: 'Where M_Boost represents the cumulative on-chain multiplier pass active on the wallet (stackable up to 6.5x).',
      weightsTitle: 'Base Scoring Weight Matrix',
      weights: [
        { metric: 'Verified GRMF Balance', weight: '1.0x per GRMF', note: 'Includes tasks, mystery boxes, and swap rewards' },
        { metric: 'Cumulative Experience (XP)', weight: '1.5 pts / XP', note: 'Earned across quests, check-ins, and milestones' },
        { metric: 'Verified Telegram Referrals', weight: '+250 pts / friend', note: 'Counted per unique authenticated invitee' },
        { metric: 'Completed Protocol Quests', weight: '+120 pts / quest', note: 'Includes partner tasks & 5 one-time Swap Missions' },
        { metric: 'Wealth Hierarchy Rank', weight: '+300 pts / level', note: 'Scales from Level 1 up to Level 10' }
      ],
      simTitle: 'Interactive TGE Allocation Simulator',
      simSub: 'Adjust the parameters below to model how on-chain multipliers amplify your final distribution score:',
      simBalanceLabel: 'Projected GRMF Balance',
      simRefsLabel: 'Active Referrals',
      simBoosterLabel: 'Active Booster Tier',
      simResultLabel: 'Projected Final Allocation Score',
      simMultiplierLabel: 'Active Multiplier',
      boostersTitle: 'Official On-Chain Multiplier Passes',
      boosters: [
        {
          name: 'On-Chain Verification Pass',
          cost: '0.5 TON',
          boost: '+25% (1.25x)',
          instantGrmf: '+1,500 GRMF',
          tgeRule: 'Anti-Sybil Verified Badge & Priority Snapshot Inclusion'
        },
        {
          name: 'Turbo Allocation Booster',
          cost: '1.5 TON',
          boost: '+75% (1.75x)',
          instantGrmf: '+5,000 GRMF',
          tgeRule: 'Removes vesting lock (100% unlocked immediately at TGE)'
        },
        {
          name: 'Whale Pool Priority Pass',
          cost: '3.0 TON',
          boost: '+150% (2.50x)',
          instantGrmf: '+12,000 GRMF',
          tgeRule: 'Direct admission into Tier-1 Whale Distribution Pool'
        },
        {
          name: 'Genesis VIP Multiplier Node',
          cost: '5.0 TON',
          boost: '+300% (4.00x)',
          instantGrmf: '+25,000 GRMF',
          tgeRule: 'Maximum boost + 24h early DEX claim before public wave'
        }
      ]
    },
    architecture: {
      specsTitle: 'Protocol Technical Specifications',
      specs: [
        { label: 'Underlying L1 Network', value: 'TON Mainnet (The Open Network)' },
        { label: 'Smart Contract Standard', value: 'TEP-74 Jetton & TEP-64 Metadata' },
        { label: 'Wallet Authentication', value: 'TON Connect 2.0 (Non-Custodial)' },
        { label: 'Block Finality Speed', value: '< 3.5 Seconds via Dynamic Sharding' },
        { label: 'Daily Task Reset Engine', value: '86,400s Deterministic Cycle (24h)' },
        { label: 'Minting Authority Status', value: 'Permanently Revoked Post-Genesis' }
      ],
      layersTitle: 'Three-Layer Security & Anti-Sybil Architecture',
      layers: [
        {
          title: '1. Immutable TEP-74 Smart Contract Core',
          badge: 'Immutable Jetton',
          body: 'Deployed with zero hidden transfer taxes, zero blacklist functions, and permanently revoked minting permissions after the 100M genesis mint.'
        },
        {
          title: '2. Cryptographic Liquidity Lock (STON.fi)',
          badge: '24-Month LP Lock',
          body: 'Initial GRMF/TON and GRMF/USDT LP tokens are locked in a verifiable time-lock contract for 24 months to guarantee market stability.'
        },
        {
          title: '3. Multi-Signal Anti-Sybil Verification',
          badge: 'Zero-Bot Policy',
          body: 'Combines native Telegram WebApp initData validation with on-chain TON micro-transactions to eliminate automated bot farms prior to TGE.'
        }
      ],
      ranksTitle: '10-Tier Wealth Progression System',
      ranksBody:
        'Users advance through 10 distinct socioeconomic ranks—from Level 1 (Poor, 0 XP) through Trader, Investor, Baron, and Tycoon up to Level 10 (Master of Wealth, 20,000+ XP)—unlocking permanent allocation weight bonuses.'
    },
    roadmap: {
      headerTitle: 'Execution Roadmap (2026 – 2027)',
      headerSub: 'Milestone-driven engineering schedule with verifiable on-chain deliverables.',
      phases: [
        {
          phase: 'Phase 1 • Q3 2026',
          period: '100% Completed',
          status: 'completed',
          statusText: 'Completed',
          progress: 100,
          title: 'Core Protocol & Fullscreen Mini-App Launch',
          items: [
            'Deployment of official Telegram Fullscreen WebApp interface.',
            'Launch of 6-asset Swap Engine (GRMF, GRAM, USDT, NOT, DOGS, HMSTR).',
            'Implementation of the 10-Tier Wealth Rank system & verified referral engine.',
            'Integration of non-custodial TON Connect 2.0 wallet authentication.'
          ]
        },
        {
          phase: 'Phase 2 • Q4 2026',
          period: 'Active Now (85%)',
          status: 'active',
          statusText: 'In Progress',
          progress: 85,
          title: 'Public Presale, On-Chain Boosters & Ecosystem Growth',
          items: [
            'Public Presale launch (5,000,000 GRMF cap) at fixed rate 1 TON = 500 GRMF.',
            'Rollout of Airdrop Multiplier Passes & 0.05 TON On-Chain Daily Check-In.',
            'Activation of one-time DEX Swap Missions & partner Telegram Mini-App network.',
            'Final Anti-Sybil audit and wallet qualification snapshot preparation.'
          ]
        },
        {
          phase: 'Phase 3 • Dec 31, 2026',
          period: 'Official TGE',
          status: 'upcoming',
          statusText: 'Upcoming Milestone',
          progress: 30,
          title: 'Token Generation Event (TGE) & DEX Liquidity Deployment',
          items: [
            'Official GRMF token distribution via the verified on-chain Claim Portal.',
            'Deployment of locked GRMF/TON & GRMF/USDT liquidity pools on STON.fi & DeDust.',
            'Early trading window unlocked for Presale buyers and Genesis VIP Node holders.',
            'Activation of the automated Buyback & Burn smart vault.'
          ]
        },
        {
          phase: 'Phase 4 • Q1–Q2 2027',
          period: 'Global Expansion',
          status: 'upcoming',
          statusText: 'Future Roadmap',
          progress: 10,
          title: 'Tier-1 CEX Listings, Staking Vaults & DAO Governance',
          items: [
            'Listing of GRMF on major centralized exchanges (Tier-1 & Tier-2 CEXs).',
            'Launch of high-yield GRMF Staking Vaults and LP yield farming.',
            'Transition to decentralized community governance (GRMF DAO).',
            'Cross-chain liquidity bridge connecting TON with EVM networks.'
          ]
        }
      ]
    }
  },
  ru: {
    title: 'Официальная Белая Книга',
    subtitle: 'Техническая архитектура и экономический протокол GRMF Fi на блокчейне TON',
    version: 'Версия v3.2',
    auditBadge: 'Проверено в TON Mainnet',
    closeBtn: 'Закрыть документ',
    treasuryLabel: 'Официальный контракт казначейства (TON)',
    copiedText: 'Скопировано',
    tabs: {
      overview: 'Обзор',
      tokenomics: 'Токеномика',
      airdrop: 'Формула Дропа',
      architecture: 'Архитектура',
      roadmap: 'Дорожная карта'
    },
    kpis: {
      supplyLabel: 'Фиксированная эмиссия',
      supplyValue: '100,000,000 GRMF',
      standardLabel: 'Стандарт токена',
      standardValue: 'TON Jetton (TEP-74)',
      presaleLabel: 'Курс Пресейла',
      presaleValue: '1 TON = 500 GRMF',
      tgeLabel: 'Дата TGE и листинга',
      tgeValue: '31 декабря 2026'
    },
    overview: {
      execTag: 'Резюме протокола',
      execTitle: 'Новое поколение интерактивного DeFi в Telegram и TON',
      execBody:
        'GRMF Fi — это децентрализованный финансовый протокол Web3, созданный для экосистемы Telegram Mini Apps и блокчейна TON. Объединяя AMM-обменник, систему Proof-of-Contribution и реальное обеспечение ликвидности, протокол решает проблему инфляции старых кликеров.',
      problemTitle: 'Проблема старых мини-приложений',
      problemBody:
        'Ранние тапалки раздавали ничем не обеспеченные токены без ликвидности, что приводило к обвалу цены после листинга и доминированию ботов.',
      solutionTitle: 'Инженерное решение GRMF Fi',
      solutionBody:
        'Каждая награда привязана к проверенным действиям (24ч задания, единоразовые Swap-миссии и TON Connect), а доходы направляются в пул ликвидности и сжигание.',
      pillarsHeader: 'Три фундаментальных столпа GRMF Fi',
      pillars: [
        {
          title: 'Децентрализованный Swap-движок',
          tag: '0.30% LP Fee',
          desc: 'Мгновенный обмен между GRMF и ключевыми активами TON (GRAM, USDT, NOT, DOGS, HMSTR) с единоразовыми квестами за каждую пару.'
        },
        {
          title: '24-часовой цикл заданий (PoC)',
          tag: '0.05 TON Check-In',
          desc: 'Точный 24-часовой таймер обновления: ончейн Daily Check-In (0.05 TON за +100 GRMF) и ежедневный Mystery Box (+35 GRMF).'
        },
        {
          title: '10 уровней Иерархии Богатства',
          tag: 'Уровень 1 → 10',
          desc: 'Накопительная система рангов от «Бедного» до «Владыки Богатства», напрямую увеличивающая вес кошелька при финальном снэпшоте.'
        }
      ],
      objectivesTitle: 'Стратегические гарантии держателям',
      objectivesList: [
        'Строго фиксированное предложение 100 000 000 GRMF с отключением функции допэмиссии.',
        'Эксклюзивный ранний доступ к торгам на STON.fi для участников пресейла.',
        'Многоуровневая защита от ботов (Anti-Sybil) через верификацию кошельков TON Connect.'
      ]
    },
    tokenomics: {
      headerTitle: 'Распределение эмиссии и график вестинга',
      headerSub: 'Сбалансированная модель для глубокой ликвидности и защиты от резких распродаж.',
      totalSupplyBadge: '100,000,000 GRMF (100%)',
      tgeLabel: 'Разлок на TGE',
      vestingLabel: 'Условия вестинга',
      pools: [
        {
          name: 'Награды сообщества и Аирдроп',
          pct: 45,
          tokens: '45,000,000 GRMF',
          tgeUnlock: 'До 100% с бустерами',
          vesting: 'Поэтапный разлок 3 мес. для базовых аккаунтов; 100% мгновенно на TGE для владельцев бустеров.',
          color: 'bg-emerald-500',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        {
          name: 'Ликвидность DEX и резервы стейкинга',
          pct: 25,
          tokens: '25,000,000 GRMF',
          tgeUnlock: '100% в пулах LP',
          vesting: 'Блокировка LP-токенов на STON.fi и DeDust сроком на 24 месяца.',
          color: 'bg-[#0088CC]',
          badgeClass: 'bg-sky-50 text-[#0088CC] border-sky-200'
        },
        {
          name: 'Команда разработки и безопасность',
          pct: 15,
          tokens: '15,000,000 GRMF',
          tgeUnlock: '0% на TGE',
          vesting: 'Полная заморозка (Cliff) на 6 месяцев, затем линейный вестинг 24 месяца.',
          color: 'bg-indigo-500',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        },
        {
          name: 'Развитие экосистемы и листинги CEX',
          pct: 10,
          tokens: '10,000,000 GRMF',
          tgeUnlock: '20% маркет-мейкинг',
          vesting: 'Резерв для листинга на биржах Tier-1 CEX и глобального маркетинга.',
          color: 'bg-amber-500',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          name: 'Пул публичного Пресейла',
          pct: 5,
          tokens: '5,000,000 GRMF',
          tgeUnlock: '100% без лока',
          vesting: 'Фиксированная цена (1 TON = 500 GRMF) и ранняя торговля на STON.fi.',
          color: 'bg-rose-500',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
        }
      ],
      revenueTitle: 'Дефляционный механизм Buyback & Burn',
      revenueSub: 'Доходы протокола в TON автоматически распределяются следующим образом:',
      revenueSplits: [
        {
          label: 'Пополнение пула ликвидности STON.fi',
          pct: '45%',
          desc: 'Прямое добавление ликвидности в пару GRMF/TON для укрепления минимальной цены.'
        },
        {
          label: 'Автоматический выкуп и сжигание',
          pct: '35%',
          desc: 'Выкуп GRMF с рынка и отправка на нулевой адрес для сокращения предложения.'
        },
        {
          label: 'Инфраструктура и аудит безопасности',
          pct: '20%',
          desc: 'Поддержка серверов, аудит смарт-контрактов и призовые пулы сообщества.'
        }
      ]
    },
    airdrop: {
      formulaTitle: 'Математическая формула расчета Аирдропа',
      formulaSub: 'Протокол использует прозрачную многофакторную формулу для определения доли каждого кошелька:',
      formulaNote: 'Где M_Boost — суммарный множитель активированных ончейн-бустеров (до 6.5x максимум).',
      weightsTitle: 'Таблица базовых весовых коэффициентов',
      weights: [
        { metric: 'Подтвержденный баланс GRMF', weight: '1.0x за токен', note: 'Включает награды за задания, боксы и свопы' },
        { metric: 'Накопленный опыт (Total XP)', weight: '1.5 очка / XP', note: 'За активность, чек-ины и достижения' },
        { metric: 'Подтвержденные рефералы', weight: '+250 очков / друг', note: 'Учитываются реальные пользователи Telegram' },
        { metric: 'Выполненные квесты', weight: '+120 очков / квест', note: 'Включая партнерские задания и 5 Swap-миссий' },
        { metric: 'Уровень богатства (Rank)', weight: '+300 очков / ур.', note: 'От 1-го до 10-го уровня' }
      ],
      simTitle: 'Интерактивный калькулятор аллокации',
      simSub: 'Измените параметры ниже, чтобы увидеть, как бустеры увеличивают ваш итоговый результат:',
      simBalanceLabel: 'Ожидаемый баланс GRMF',
      simRefsLabel: 'Активные рефералы',
      simBoosterLabel: 'Активный бустер',
      simResultLabel: 'Итоговый рейтинг аллокации',
      simMultiplierLabel: 'Активный множитель',
      boostersTitle: 'Официальные ончейн-бустеры распределения',
      boosters: [
        {
          name: 'On-Chain Verification Pass',
          cost: '0.5 TON',
          boost: '+25% (1.25x)',
          instantGrmf: '+1,500 GRMF',
          tgeRule: 'Защита Anti-Sybil и приоритетный вывод'
        },
        {
          name: 'Turbo Allocation Booster',
          cost: '1.5 TON',
          boost: '+75% (1.75x)',
          instantGrmf: '+5,000 GRMF',
          tgeRule: 'Снятие вестинга (100% мгновенный разлок на TGE)'
        },
        {
          name: 'Whale Pool Priority Pass',
          cost: '3.0 TON',
          boost: '+150% (2.50x)',
          instantGrmf: '+12,000 GRMF',
          tgeRule: 'Доступ в приоритетный пул китов (Tier-1 Whale Pool)'
        },
        {
          name: 'Genesis VIP Multiplier Node',
          cost: '5.0 TON',
          boost: '+300% (4.00x)',
          instantGrmf: '+25,000 GRMF',
          tgeRule: 'Максимальный буст + клейм на 24ч раньше общего пула'
        }
      ]
    },
    architecture: {
      specsTitle: 'Технические спецификации протокола',
      specs: [
        { label: 'Базовый блокчейн', value: 'TON Mainnet (The Open Network)' },
        { label: 'Стандарт смарт-контракта', value: 'TEP-74 Jetton & TEP-64 Metadata' },
        { label: 'Протокол кошельков', value: 'TON Connect 2.0 (Некастодиальный)' },
        { label: 'Финализация транзакций', value: '< 3.5 сек (Динамический шардинг)' },
        { label: 'Цикл ежедневных заданий', value: '86 400 сек (Детерминированные 24ч)' },
        { label: 'Права на чеканку (Mint)', value: 'Навсегда отозваны после генезиса' }
      ],
      layersTitle: 'Трехуровневая матрица безопасности',
      layers: [
        {
          title: '1. Неизменяемый смарт-контракт TEP-74',
          badge: 'Immutable Jetton',
          body: 'Контракт развернут без скрытых комиссий, черных списков и возможности дополнительной эмиссии свыше 100 млн GRMF.'
        },
        {
          title: '2. Криптографическая блокировка ликвидности',
          badge: '24-Month LP Lock',
          body: 'Токены ликвидности пар GRMF/TON и GRMF/USDT блокируются на STON.fi на 24 месяца через проверяемый таймлок-контракт.'
        },
        {
          title: '3. Многофакторная защита Anti-Sybil',
          badge: 'Zero-Bot Policy',
          body: 'Сочетание проверки Telegram WebApp initData и ончейн-транзакций TON исключает ботов перед финальным распределением.'
        }
      ],
      ranksTitle: 'Архитектура 10 рангов Богатства',
      ranksBody:
        'Пользователи проходят путь от 1-го уровня («Бедный», 0 XP) до 10-го уровня («Владыка Богатства», 20 000+ XP), получая постоянный бонус к весу кошелька.'
    },
    roadmap: {
      headerTitle: 'Дорожная карта реализации (2026 – 2027)',
      headerSub: 'Поэтапный инженерный план с проверяемыми результатами.',
      phases: [
        {
          phase: 'Фаза 1 • Q3 2026',
          period: 'Завершено 100%',
          status: 'completed',
          statusText: 'Выполнено',
          progress: 100,
          title: 'Запуск ядра протокола и полноэкранного Mini-App',
          items: [
            'Развертывание официального полноэкранного режима Telegram WebApp.',
            'Запуск Swap-движка для 6 токенов (GRMF, GRAM, USDT, NOT, DOGS, HMSTR).',
            'Внедрение 10 уровней Богатства и реферальной системы.',
            'Интеграция некастодиальной авторизации TON Connect 2.0.'
          ]
        },
        {
          phase: 'Фаза 2 • Q4 2026',
          period: 'Активно (85%)',
          status: 'active',
          statusText: 'Текущий этап',
          progress: 85,
          title: 'Пресейл, ончейн-бустеры и расширение экосистемы',
          items: [
            'Публичный пресейл (пул 5 000 000 GRMF) по фиксированному курсу 1 TON = 500 GRMF.',
            'Запуск бустеров аллокации и ежедневного чек-ина (0.05 TON за +100 GRMF).',
            'Активация единоразовых Swap-миссий и партнерских интеграций.',
            'Финальная Anti-Sybil фильтрация перед снэпшотом.'
          ]
        },
        {
          phase: 'Фаза 3 • 31 декабря 2026',
          period: 'Официальный TGE',
          status: 'upcoming',
          statusText: 'Следующий этап',
          progress: 30,
          title: 'Генерация токенов (TGE) и листинг на DEX',
          items: [
            'Официальное распределение GRMF через портал мгновенного клейма.',
            'Запуск пулов ликвидности GRMF/TON и GRMF/USDT на STON.fi и DeDust.',
            'Открытие ранней торговли для участников пресейла и владельцев Genesis VIP.',
            'Запуск автоматического хранилища Buyback & Burn.'
          ]
        },
        {
          phase: 'Фаза 4 • Q1–Q2 2027',
          period: 'Масштабирование',
          status: 'upcoming',
          statusText: 'План 2027',
          progress: 10,
          title: 'Листинги на Tier-1 CEX, стейкинг и DAO',
          items: [
            'Листинг GRMF на ведущих централизованных биржах (Tier-1 и Tier-2 CEX).',
            'Запуск высокодоходных пулов стейкинга GRMF Staking Vaults.',
            'Переход к децентрализованному управлению сообществом (GRMF DAO).',
            'Кросс-чейн мост ликвидности между TON и сетями EVM.'
          ]
        }
      ]
    }
  },
  fa: {
    title: 'وایت‌پیپر رسمی پروتکل',
    subtitle: 'معماری فنی و پروتکل اقتصادی اکوسیستم GRMF Fi بر بستر بلاکچین TON',
    version: 'نسخه v3.2',
    auditBadge: 'تأییدشده در TON Mainnet',
    closeBtn: 'بستن وایت‌پیپر',
    treasuryLabel: 'آدرس رسمی خزانه پروتکل (TON)',
    copiedText: 'کپی شد',
    tabs: {
      overview: 'نگاه کلی',
      tokenomics: 'توکنومیکس',
      airdrop: 'فرمول ایردراپ',
      architecture: 'معماری و امنیت',
      roadmap: 'نقشه راه'
    },
    kpis: {
      supplyLabel: 'عرضه کل ثابت',
      supplyValue: '100,000,000 GRMF',
      standardLabel: 'استاندارد شبکه',
      standardValue: 'TON Jetton (TEP-74)',
      presaleLabel: 'نرخ پیش‌فروش',
      presaleValue: '1 TON = 500 GRMF',
      tgeLabel: 'تاریخ رسمی TGE',
      tgeValue: '۳۱ دسامبر ۲۰۲۶'
    },
    overview: {
      execTag: 'خلاصه مدیریتی پروتکل',
      execTitle: 'نسل جدید دیفای تعاملی بومی در تلگرام و بلاکچین TON',
      execBody:
        'پروتکل GRMF Fi یک زیرساخت مالی غیرمتمرکز نسل سوم (Web3 DeFi) است که به صورت اختصاصی برای اکوسیستم مینی‌اپ‌های تلگرام و شبکه TON طراحی شده است. با ترکیب موتور سواپ خودکار (AMM)، سیستم اثبات مشارکت (PoC) و پشتوانه نقدینگی واقعی، مشکل تورم پروژه‌های قدیمی حل شده است.',
      problemTitle: 'چالش مینی‌اپ‌های سنتی',
      problemBody:
        'پروژه‌های کلیکی قدیمی توکن‌ها را بدون پشتوانه نقدینگی یا کاربرد واقعی توزیع می‌کردند که منجر به سقوط شدید قیمت پس از لیست شدن و تسلط ربات‌ها می‌شد.',
      solutionTitle: 'راهکار مهندسی GRMF Fi',
      solutionBody:
        'هر پاداش به فعالیت واقعی و تأییدشده (ماموریت‌های ۲۴ ساعته، ماموریت‌های سواپ یک‌باره و اتصال TON Connect) متصل است و درآمدهای پروتکل مستقیماً صرف استخر نقدینگی و توکن‌سوزی می‌شود.',
      pillarsHeader: 'سه رکن اقتصادی اکوسیستم GRMF Fi',
      pillars: [
        {
          title: 'موتور مبادله غیرمتمرکز (DEX Swap Engine)',
          tag: '0.30% LP Fee',
          desc: 'مبادله آنی بین GRMF و توکن‌های برتر شبکه تون (GRAM, USDT, NOT, DOGS, HMSTR) همراه با ماموریت‌های سواپ یک‌باره برای هر جفت ارز.'
        },
        {
          title: 'موتور ماموریت‌های ۲۴ ساعته (24h PoC)',
          tag: '0.05 TON Check-In',
          desc: 'چرخه دقیق ۲۴ ساعته شامل چک-این روزانه روی شبکه (0.05 TON برای +100 GRMF) و جعبه شانس روزانه (+35 GRMF).'
        },
        {
          title: 'سلسله‌مراتب ۱۰ سطحی ثروت (Wealth Hierarchy)',
          tag: 'Level 1 → Level 10',
          desc: 'سیستم ارتقای رتبه از سطح ۱ (فقیر) تا سطح ۱۰ (ارباب ثروت) بر اساس XP که وزن نهایی کیف‌پول را در اسنپ‌شات افزایش می‌دهد.'
        }
      ],
      objectivesTitle: 'تضمین‌های استراتژیک برای هولدرها',
      objectivesList: [
        'عرضه کل کاملاً ثابت ۱۰۰ میلیون GRMF با لغو دائمی قابلیت ضرب توکن جدید.',
        'دسترسی زودهنگام و انحصاری به معاملات در صرافی STON.fi برای شرکت‌کنندگان پیش‌فروش.',
        'فیلترینگ پیشرفته ضد ربات (Anti-Sybil) از طریق تأیید کیف‌پول در شبکه TON.'
      ]
    },
    tokenomics: {
      headerTitle: 'تخصیص عرضه و زمان‌بندی آزادسازی (Vesting)',
      headerSub: 'طراحی‌شده برای تضمین نقدینگی عمیق در زمان لیست شدن و جلوگیری از فشار فروش ناگهانی.',
      totalSupplyBadge: '100,000,000 GRMF (100%)',
      tgeLabel: 'آزادسازی در TGE',
      vestingLabel: 'شرایط وستینگ',
      pools: [
        {
          name: 'پاداش‌های جامعه و ایردراپ (Airdrop & Mining)',
          pct: 45,
          tokens: '45,000,000 GRMF',
          tgeUnlock: 'تا ۱۰۰٪ با بوسترها',
          vesting: 'آزادسازی ۳ ماهه برای حساب‌های عادی؛ آزادسازی ۱۰۰٪ آنی در TGE برای دارندگان بوستر.',
          color: 'bg-emerald-500',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        {
          name: 'نقدینگی صرافی‌ها و ذخایر استیکینگ (DEX LP)',
          pct: 25,
          tokens: '25,000,000 GRMF',
          tgeUnlock: '۱۰۰٪ قفل در نقدینگی',
          vesting: 'قفل کامل در استخرهای STON.fi و DeDust به مدت ۲۴ ماه جهت تضمین عمق بازار.',
          color: 'bg-[#0088CC]',
          badgeClass: 'bg-sky-50 text-[#0088CC] border-sky-200'
        },
        {
          name: 'توسعه هسته و امنیت سایبری (Core Team)',
          pct: 15,
          tokens: '15,000,000 GRMF',
          tgeUnlock: '۰٪ در زمان TGE',
          vesting: '۶ ماه قفل کامل (Cliff) و سپس آزادسازی خطی ماهانه طی ۲۴ ماه.',
          color: 'bg-indigo-500',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        },
        {
          name: 'توسعه اکوسیستم و لیستینگ صرافی‌ها (CEX)',
          pct: 10,
          tokens: '10,000,000 GRMF',
          tgeUnlock: '۲۰٪ بازارگردانی',
          vesting: 'اختصاص‌یافته به لیست شدن در صرافی‌های تراز اول (Tier-1 CEX) و همکاری‌های جهانی.',
          color: 'bg-amber-500',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          name: 'استخر پیش‌فروش عمومی (Presale Pool)',
          pct: 5,
          tokens: '5,000,000 GRMF',
          tgeUnlock: '۱۰۰٪ بدون قفل',
          vesting: 'نرخ ثابت (1 TON = 500 GRMF) با امتیاز معامله زودهنگام در صرافی STON.fi.',
          color: 'bg-rose-500',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
        }
      ],
      revenueTitle: 'مکانیسم ضدتورمی بازخرید و توکن‌سوزی (Buyback & Burn)',
      revenueSub: 'تمامی درآمدهای TON پروتکل به صورت خودکار به شرح زیر تخصیص می‌یابد:',
      revenueSplits: [
        {
          label: 'تزریق به استخر نقدینگی STON.fi',
          pct: '45%',
          desc: 'تزریق مستقیم به استخر GRMF/TON برای تقویت مستمر کف قیمتی توکن.'
        },
        {
          label: 'خزانه بازخرید و توکن‌سوزی خودکار',
          pct: '35%',
          desc: 'خرید GRMF از بازار آزاد و ارسال به آدرس سوزاندن جهت کاهش عرضه در گردش.'
        },
        {
          label: 'زیرساخت و ممیزی امنیتی قراردادها',
          pct: '20%',
          desc: 'تأمین هزینه‌های سرورهای همگام‌سازی آنی، امنیت و جوایز جامعه.'
        }
      ]
    },
    airdrop: {
      formulaTitle: 'فرمول ریاضی محاسبه ایردراپ (Airdrop Formula)',
      formulaSub: 'پروتکل از یک الگوریتم شفاف چندعاملی برای محاسبه سهم نهایی هر کیف‌پول استفاده می‌کند:',
      formulaNote: 'که در آن M_Boost ضریب تجمعی بوسترهای فعال روی کیف‌پول است (حداکثر تا 6.5x).',
      weightsTitle: 'جدول وزن‌دهی امتیازات پایه',
      weights: [
        { metric: 'موجودی تأییدشده GRMF', weight: '1.0x به ازای هر توکن', note: 'شامل پاداش تسک‌ها، جعبه‌ها و سواپ‌ها' },
        { metric: 'امتیاز تجربه کل (Total XP)', weight: '1.5 امتیاز / XP', note: 'کسب‌شده از فعالیت‌های روزانه و ارتقای سطح' },
        { metric: 'دعوت‌های تأییدشده (Referrals)', weight: '+250 امتیاز / نفر', note: 'کاربران واقعی متصل به تلگرام' },
        { metric: 'ماموریت‌های تکمیل‌شده', weight: '+120 امتیاز / تسک', note: 'شامل تسک‌های همکاران و ۵ ماموریت سواپ' },
        { metric: 'رتبه ثروت (Wealth Rank)', weight: '+300 امتیاز / سطح', note: 'از سطح ۱ تا سطح ۱۰' }
      ],
      simTitle: 'شبیه‌ساز تعاملی سهم ایردراپ',
      simSub: 'مقادیر زیر را تغییر دهید تا تأثیر بوسترها بر امتیاز نهایی خود را مشاهده کنید:',
      simBalanceLabel: 'موجودی پیش‌بینی‌شده GRMF',
      simRefsLabel: 'تعداد زیرمجموعه‌های فعال',
      simBoosterLabel: 'بوستر فعال (Booster Pass)',
      simResultLabel: 'امتیاز کل تخصیص نهایی',
      simMultiplierLabel: 'ضریب افزایشی فعال',
      boostersTitle: 'مشخصات کارت‌های تقویت‌کننده ایردراپ',
      boosters: [
        {
          name: 'On-Chain Verification Pass',
          cost: '0.5 TON',
          boost: '+25% (1.25x)',
          instantGrmf: '+1,500 GRMF',
          tgeRule: 'نشان تایید Anti-Sybil و اولویت در اسنپ‌شات'
        },
        {
          name: 'Turbo Allocation Booster',
          cost: '1.5 TON',
          boost: '+75% (1.75x)',
          instantGrmf: '+5,000 GRMF',
          tgeRule: 'حذف قفل وستینگ (آزادسازی ۱۰۰٪ آنی در TGE)'
        },
        {
          name: 'Whale Pool Priority Pass',
          cost: '3.0 TON',
          boost: '+150% (2.50x)',
          instantGrmf: '+12,000 GRMF',
          tgeRule: 'ورود مستقیم به استخر ویژه نهنگ‌ها (Whale Pool)'
        },
        {
          name: 'Genesis VIP Multiplier Node',
          cost: '5.0 TON',
          boost: '+300% (4.00x)',
          instantGrmf: '+25,000 GRMF',
          tgeRule: 'حداکثر ضریب + برداشت ۲۴ ساعت قبل از توزیع عمومی'
        }
      ]
    },
    architecture: {
      specsTitle: 'مشخصات فنی پروتکل (Technical Stack)',
      specs: [
        { label: 'شبکه بلاکچین پایه', value: 'TON Mainnet (The Open Network)' },
        { label: 'استاندارد قرارداد هوشمند', value: 'TEP-74 Jetton & TEP-64 Metadata' },
        { label: 'پروتکل اتصال کیف‌پول', value: 'TON Connect 2.0 (غیرامانی)' },
        { label: 'سرعت نهایی‌سازی تراکنش', value: '< 3.5 ثانیه با شاردینگ پویا' },
        { label: 'چرخه بازنشانی تسک‌های روزانه', value: '۸۶,۴۰۰ ثانیه (۲۴ ساعت دقیق)' },
        { label: 'وضعیت ضرب توکن جدید (Mint)', value: 'لغو دائمی پس از تولید اولیه' }
      ],
      layersTitle: 'ماتریس امنیتی سه‌لایه پروتکل',
      layers: [
        {
          title: '۱. قرارداد هوشمند تغییرناپذیر TEP-74',
          badge: 'Immutable Jetton',
          body: 'قرارداد توکن GRMF بدون هیچ‌گونه مالیات پنهان یا قابلیت مسدودسازی طراحی شده و دسترسی ضرب توکن جدید برای همیشه بسته شده است.'
        },
        {
          title: '۲. قفل زمانی نقدینگی در STON.fi',
          badge: '24-Month LP Lock',
          body: 'توکن‌های نقدینگی (LP) جفت‌ارزهای GRMF/TON و GRMF/USDT به مدت ۲۴ ماه در قرارداد زمانی غیرقابل شکست قفل می‌شوند.'
        },
        {
          title: '۳. سپر دفاعی ضد ربات (Anti-Sybil Engine)',
          badge: 'Zero-Bot Policy',
          body: 'ترکیب اعتبارسنجی Telegram WebApp با تراکنش‌های خرد روی شبکه TON، مزارع ربات را پیش از اسنپ‌شات حذف می‌کند.'
        }
      ],
      ranksTitle: 'معماری ۱۰ سطحی ثروت (Wealth Progression)',
      ranksBody:
        'کاربران از سطح ۱ (فقیر - 0 XP) شروع کرده و با کسب XP تا سطح ۱۰ (ارباب ثروت - 20,000+ XP) ارتقا می‌یابند که ضریب دائمی در توزیع پاداش‌ها ایجاد می‌کند.'
    },
    roadmap: {
      headerTitle: 'نقشه راه اجرایی (۲۰۲۶ – ۲۰۲۷)',
      headerSub: 'برنامه زمان‌بندی مهندسی با دستاوردهای قابل راستی‌آزمایی روی بلاکچین.',
      phases: [
        {
          phase: 'فاز ۱ • Q3 2026',
          period: 'تکمیل شده ۱۰۰٪',
          status: 'completed',
          statusText: 'انجام شده',
          progress: 100,
          title: 'زیرساخت هسته و راه‌اندازی مینی‌اپ تمام‌صفحه',
          items: [
            'انتشار رابط کاربری تمام‌صفحه رسمی تلگرام (Fullscreen WebApp).',
            'راه‌اندازی موتور سواپ ۶ توکن اصلی (GRMF, GRAM, USDT, NOT, DOGS, HMSTR).',
            'پیاده‌سازی سیستم ۱۰ سطحی رتبه‌های ثروت و سیستم زیرمجموعه‌گیری.',
            'یکپارچه‌سازی اتصال کیف‌پول غیرامانی TON Connect 2.0.'
          ]
        },
        {
          phase: 'فاز ۲ • Q4 2026',
          period: 'در حال اجرا (۸۵٪)',
          status: 'active',
          statusText: 'فاز فعال کنونی',
          progress: 85,
          title: 'پیش‌فروش عمومی، بوسترهای ایردراپ و گسترش اکوسیستم',
          items: [
            'آغاز پیش‌فروش عمومی (ظرفیت ۵ میلیون GRMF) با نرخ ثابت 1 TON = 500 GRMF.',
            'فعال‌سازی کارت‌های بوستر ایردراپ و چک-این روزانه روی شبکه (0.05 TON).',
            'فعال‌سازی ماموریت‌های سواپ یک‌باره و همکاری با مینی‌اپ‌های برتر تلگرام.',
            'پایش نهایی Anti-Sybil و آماده‌سازی اسنپ‌شات کیف‌پول‌های واجد شرایط.'
          ]
        },
        {
          phase: 'فاز ۳ • ۳۱ دسامبر ۲۰۲۶',
          period: 'رویداد رسمی TGE',
          status: 'upcoming',
          statusText: 'مرحله بعدی',
          progress: 30,
          title: 'تولید توکن (TGE) و راه‌اندازی استخرهای نقدینگی DEX',
          items: [
            'توزیع رسمی توکن‌های GRMF از طریق پورتال برداشت آنی.',
            'راه‌اندازی استخرهای نقدینگی قفل‌شده GRMF/TON و GRMF/USDT در STON.fi و DeDust.',
            'بازگشایی معاملات زودهنگام برای خریداران پیش‌فروش و دارندگان Genesis VIP.',
            'فعال‌سازی خزانه هوشمند بازخرید و توکن‌سوزی خودکار.'
          ]
        },
        {
          phase: 'فاز ۴ • Q1–Q2 2027',
          period: 'توسعه جهانی',
          status: 'upcoming',
          statusText: 'برنامه ۲۰۲۷',
          progress: 10,
          title: 'لیست شدن در صرافی‌های متمرکز (CEX) و حاکمیت DAO',
          items: [
            'لیست شدن GRMF در صرافی‌های متمرکز تراز اول و دوم (Tier-1 & Tier-2 CEX).',
            'راه‌اندازی خزانه‌های استیکینگ GRMF با سود مرکب سالانه.',
            'انتقال به حاکمیت غیرمتمرکز جامعه (GRMF DAO).',
            'ساخت پل نقدینگی میان‌زنجیره‌ای (Cross-Chain Bridge) بین TON و شبکه‌های EVM.'
          ]
        }
      ]
    }
  }
};

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' }
];

const SIM_BOOSTER_OPTIONS = [
  { id: 'none', label: 'Base (1.00x)', multiplier: 1.0, instantBonus: 0 },
  { id: 'verify', label: 'Verify Pass (+25% / 1.25x)', multiplier: 1.25, instantBonus: 1500 },
  { id: 'turbo', label: 'Turbo Booster (+75% / 1.75x)', multiplier: 1.75, instantBonus: 5000 },
  { id: 'whale', label: 'Whale Pass (+150% / 2.50x)', multiplier: 2.5, instantBonus: 12000 },
  { id: 'genesis', label: 'Genesis VIP (+300% / 4.00x)', multiplier: 4.0, instantBonus: 25000 },
  { id: 'max', label: 'Full Stack All Passes (6.50x)', multiplier: 6.5, instantBonus: 43500 }
];

export const WhitepaperModal: React.FC<WhitepaperModalProps> = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [copiedTreasury, setCopiedTreasury] = useState(false);

  // Interactive simulator state inside the Airdrop Math tab
  const [simBalance, setSimBalance] = useState<number>(5000);
  const [simReferrals, setSimReferrals] = useState<number>(10);
  const [simBoosterId, setSimBoosterId] = useState<string>('turbo');

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar' || lang === 'fa';

  const selectedBooster = SIM_BOOSTER_OPTIONS.find((b) => b.id === simBoosterId) || SIM_BOOSTER_OPTIONS[0];
  const simulatedBaseScore =
    (simBalance + selectedBooster.instantBonus) * 1.0 +
    1200 * 1.5 + // representative XP
    simReferrals * 250 +
    8 * 120 + // representative completed quests
    5 * 300; // representative Rank 5
  const simulatedFinalScore = Math.round(simulatedBaseScore * selectedBooster.multiplier);

  const handleCopyTreasury = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(TREASURY_ADDRESS);
    setCopiedTreasury(true);
    setTimeout(() => setCopiedTreasury(false), 2000);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/80 backdrop-blur-md sm:items-center sm:p-4"
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
          className="w-full max-w-xl bg-[#F8FAFC] rounded-t-[32px] sm:rounded-[32px] text-slate-900 shadow-2xl relative overflow-hidden border-t sm:border border-slate-200/90 h-[90dvh] max-h-[90dvh] flex flex-col justify-between"
        >
          {/* Top Sticky Institutional Header */}
          <div className="bg-white border-b border-slate-200/80 px-4 sm:px-5 pt-3 pb-2.5 shrink-0">
            {/* Pull Handle */}
            <div className="w-11 h-1.5 bg-slate-200 rounded-full mx-auto mb-2.5" />

            {/* Language Selector Bar */}
            <div className="flex items-center justify-between bg-slate-100/90 border border-slate-200/70 p-1 rounded-xl mb-3 gap-1">
              <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-500 px-1.5 shrink-0">
                <Languages className="w-3.5 h-3.5 text-[#0088CC] shrink-0" />
                <span className="hidden sm:inline uppercase tracking-wider text-[9px]">Language</span>
              </div>

              <div className="grid grid-cols-4 gap-1 flex-1 min-w-0">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      triggerHaptic('light');
                      setLang(l.code);
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap min-w-0 ${
                      lang === l.code
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-transparent text-slate-600 hover:bg-white/70'
                    }`}
                  >
                    <span className="text-[11px] leading-none shrink-0">{l.flag}</span>
                    <span className="truncate">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Title Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0 border border-slate-800">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                      {t.title}
                    </h2>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-sky-50 text-[#0088CC] px-2 py-0.5 rounded-md border border-sky-200 shrink-0">
                      {t.version}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      <ShieldCheck className="w-3 h-3" /> {t.auditBadge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                    {t.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section Navigation Tabs */}
            <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-2xl mt-3">
              {(
                [
                  { id: 'overview', label: t.tabs.overview, icon: Globe },
                  { id: 'tokenomics', label: t.tabs.tokenomics, icon: Coins },
                  { id: 'airdrop', label: t.tabs.airdrop, icon: Calculator },
                  { id: 'architecture', label: t.tabs.architecture, icon: ShieldCheck },
                  { id: 'roadmap', label: t.tabs.roadmap, icon: Rocket }
                ] as { id: TabKey; label: string; icon: any }[]
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveTab(tab.id);
                    }}
                    className={`py-2 px-1 rounded-xl text-[10px] font-extrabold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer text-center ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#0088CC]' : 'text-slate-400'}`} />
                    <span className="truncate max-w-full leading-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
            {/* TAB 1: OVERVIEW & VISION */}
            {activeTab === 'overview' && (
              <motion.div
                key={`overview-${lang}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Executive Hero Banner */}
                <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md relative overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-400/20 px-2.5 py-1 rounded-lg mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.overview.execTag}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug mb-2">
                    {t.overview.execTitle}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {t.overview.execBody}
                  </p>

                  {/* 4 Key Protocol Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800">
                    <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                      <span className="text-[9px] text-slate-400 font-bold block">{t.kpis.supplyLabel}</span>
                      <span className="text-xs font-extrabold font-mono tabular-nums text-white mt-0.5 block">
                        {t.kpis.supplyValue}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                      <span className="text-[9px] text-slate-400 font-bold block">{t.kpis.standardLabel}</span>
                      <span className="text-xs font-extrabold font-mono tabular-nums text-sky-400 mt-0.5 block">
                        {t.kpis.standardValue}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                      <span className="text-[9px] text-slate-400 font-bold block">{t.kpis.presaleLabel}</span>
                      <span className="text-xs font-extrabold font-mono tabular-nums text-emerald-400 mt-0.5 block">
                        {t.kpis.presaleValue}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                      <span className="text-[9px] text-slate-400 font-bold block">{t.kpis.tgeLabel}</span>
                      <span className="text-xs font-extrabold font-mono tabular-nums text-amber-400 mt-0.5 block">
                        {t.kpis.tgeValue}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Official On-Chain Treasury Contract Box */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
                      {t.treasuryLabel}
                    </span>
                    <p className="text-[11px] font-mono text-slate-800 font-bold truncate" dir="ltr">
                      {TREASURY_ADDRESS}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyTreasury}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-extrabold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedTreasury ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">{t.copiedText}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Problem vs Solution Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/70">
                    <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-xs mb-1.5">
                      <Scale className="w-4 h-4 shrink-0" />
                      <span>{t.overview.problemTitle}</span>
                    </div>
                    <p className="text-[11px] text-rose-900/80 leading-relaxed font-medium">
                      {t.overview.problemBody}
                    </p>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/70">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs mb-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{t.overview.solutionTitle}</span>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 leading-relaxed font-medium">
                      {t.overview.solutionBody}
                    </p>
                  </div>
                </div>

                {/* 3 Core Architectural Pillars */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#0088CC] shrink-0" />
                    <span>{t.overview.pillarsHeader}</span>
                  </h4>

                  <div className="space-y-2.5">
                    {t.overview.pillars.map((pillar, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">{pillar.title}</span>
                          <span className="text-[10px] font-mono font-bold bg-white text-[#0088CC] px-2 py-0.5 rounded-md border border-slate-200">
                            {pillar.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          {pillar.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategic Holder Guarantees */}
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
                  <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{t.overview.objectivesTitle}</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {t.overview.objectivesList.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] font-semibold text-amber-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* TAB 2: TOKENOMICS & VESTING */}
            {activeTab === 'tokenomics' && (
              <motion.div
                key={`tokenomics-${lang}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{t.tokenomics.headerTitle}</span>
                    </h3>
                    <span className="text-[10px] font-mono font-extrabold bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                      {t.tokenomics.totalSupplyBadge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mb-4">
                    {t.tokenomics.headerSub}
                  </p>

                  {/* Multi-Segment Visual Supply Bar */}
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-200 mb-4">
                    <div className="h-full bg-emerald-500 rounded-s-full" style={{ width: '45%' }} title="45%" />
                    <div className="h-full bg-[#0088CC]" style={{ width: '25%' }} title="25%" />
                    <div className="h-full bg-indigo-500" style={{ width: '15%' }} title="15%" />
                    <div className="h-full bg-amber-500" style={{ width: '10%' }} title="10%" />
                    <div className="h-full bg-rose-500 rounded-e-full" style={{ width: '5%' }} title="5%" />
                  </div>

                  {/* Detailed Allocation & Vesting Cards */}
                  <div className="space-y-3">
                    {t.tokenomics.pools.map((pool, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${pool.color}`} />
                            <span className="text-xs font-extrabold text-slate-900 truncate">{pool.name}</span>
                          </div>
                          <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${pool.badgeClass}`}>
                            {pool.pct}% • {pool.tokens}
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pool.color}`} style={{ width: `${pool.pct}%` }} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10.5px]">
                          <span className="text-slate-500 font-semibold">
                            <strong className="text-slate-800">{t.tokenomics.tgeLabel}:</strong> {pool.tgeUnlock}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-600 leading-relaxed font-medium border-t border-slate-200/60 pt-1.5">
                          <strong className="text-slate-800">{t.tokenomics.vestingLabel}:</strong> {pool.vesting}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deflationary Revenue & Buyback Engine */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                    <Flame className="w-4 h-4 shrink-0" />
                    <span>{t.tokenomics.revenueTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t.tokenomics.revenueSub}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {t.tokenomics.revenueSplits.map((split, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-extrabold font-mono text-sky-400">{split.pct}</span>
                          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-[11px] font-extrabold text-white block">{split.label}</span>
                        <p className="text-[10px] text-slate-400 leading-snug">{split.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: AIRDROP MATH & SIMULATOR */}
            {activeTab === 'airdrop' && (
              <motion.div
                key={`airdrop-${lang}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Mathematical Equation Card */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs uppercase tracking-wider">
                    <Calculator className="w-4 h-4 shrink-0" />
                    <span>{t.airdrop.formulaTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t.airdrop.formulaSub}
                  </p>

                  <div
                    dir="ltr"
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-nowrap leading-relaxed"
                  >
                    Allocation_Score = [ (GRMF × 1.0) + (XP × 1.5) + (Refs × 250) + (Quests × 120) + (Rank × 300) ] × M_Boost
                  </div>

                  <p className="text-[10.5px] text-slate-400 font-medium">
                    {t.airdrop.formulaNote}
                  </p>
                </div>

                {/* Interactive Allocation Simulator */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{t.airdrop.simTitle}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {t.airdrop.simSub}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Balance Input */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1.5">
                        <span>{t.airdrop.simBalanceLabel}</span>
                        <span className="font-mono font-extrabold text-[#0088CC]">
                          {simBalance.toLocaleString()} GRMF
                        </span>
                      </div>
                      <input
                        type="range"
                        min={500}
                        max={100000}
                        step={500}
                        value={simBalance}
                        onChange={(e) => setSimBalance(Number(e.target.value))}
                        className="w-full accent-[#0088CC] cursor-pointer"
                      />
                    </div>

                    {/* Referrals Input */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1.5">
                        <span>{t.airdrop.simRefsLabel}</span>
                        <span className="font-mono font-extrabold text-indigo-600">{simReferrals}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={simReferrals}
                        onChange={(e) => setSimReferrals(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Booster Tier Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      {t.airdrop.simBoosterLabel}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {SIM_BOOSTER_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            triggerHaptic('light');
                            setSimBoosterId(opt.id);
                          }}
                          className={`py-2 px-2.5 rounded-xl text-[10px] font-extrabold border text-center transition-all cursor-pointer truncate ${
                            simBoosterId === opt.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulated Result Box */}
                  <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                        {t.airdrop.simResultLabel}
                      </span>
                      <span className="text-xl font-extrabold font-mono tabular-nums text-slate-900">
                        {simulatedFinalScore.toLocaleString()} <span className="text-xs text-[#0088CC]">PTS</span>
                      </span>
                    </div>
                    <div className="text-end">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                        {t.airdrop.simMultiplierLabel}
                      </span>
                      <span className="text-sm font-extrabold font-mono text-emerald-600 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                        {selectedBooster.multiplier.toFixed(2)}x Boost
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scoring Weights Table */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    {t.airdrop.weightsTitle}
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {t.airdrop.weights.map((w, i) => (
                      <div key={i} className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-slate-900 block">{w.metric}</span>
                          <span className="text-[10.5px] text-slate-500 font-medium">{w.note}</span>
                        </div>
                        <span className="text-[11px] font-mono font-extrabold text-[#0088CC] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/70 shrink-0">
                          {w.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booster Specs Comparison */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    {t.airdrop.boostersTitle}
                  </h4>
                  <div className="space-y-2">
                    {t.airdrop.boosters.map((b, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-900">{b.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                              {b.boost}
                            </span>
                            <span className="text-[10px] font-mono font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded-md">
                              {b.cost}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px] text-slate-600 font-medium pt-0.5">
                          <span>{b.tgeRule}</span>
                          <span className="font-mono font-bold text-amber-600 shrink-0">{b.instantGrmf}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: ARCHITECTURE & SECURITY */}
            {activeTab === 'architecture' && (
              <motion.div
                key={`architecture-${lang}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Technical Specifications Grid */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#0088CC] shrink-0" />
                    <span>{t.architecture.specsTitle}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {t.architecture.specs.map((spec, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {spec.label}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Security Layers */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider px-1">
                    {t.architecture.layersTitle}
                  </h4>
                  {t.architecture.layers.map((layer, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                          <h5 className="text-xs font-extrabold text-slate-900">{layer.title}</h5>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                          {layer.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        {layer.body}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Wealth Progression Architecture */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>{t.architecture.ranksTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t.architecture.ranksBody}
                  </p>
                </div>
              </motion.div>
            )}

            {/* TAB 5: ROADMAP & EXECUTION PLAN */}
            {activeTab === 'roadmap' && (
              <motion.div
                key={`roadmap-${lang}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Rocket className="w-4 h-4 text-[#0088CC] shrink-0" />
                    <span>{t.roadmap.headerTitle}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {t.roadmap.headerSub}
                  </p>
                </div>

                <div className="space-y-3">
                  {t.roadmap.phases.map((phase, idx) => {
                    const isCompleted = phase.status === 'completed';
                    const isActive = phase.status === 'active';
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-3xl border transition-all space-y-3 ${
                          isActive
                            ? 'bg-white border-[#0088CC] shadow-md ring-2 ring-[#0088CC]/10'
                            : 'bg-white border-slate-200/90 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isActive
                                  ? 'bg-sky-50 text-[#0088CC] border-sky-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {phase.phase}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{phase.statusText}</span>
                          </div>
                          <span className="text-[10px] font-mono font-extrabold text-slate-700">
                            {phase.period}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{phase.title}</h4>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                            <div
                              className={`h-full rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-500'
                                  : isActive
                                  ? 'bg-[#0088CC]'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${phase.progress}%` }}
                            />
                          </div>
                        </div>

                        <ul className="space-y-1.5 pt-1">
                          {phase.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 font-medium">
                              {isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : isActive ? (
                                <Clock className="w-3.5 h-3.5 text-[#0088CC] shrink-0 mt-0.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="bg-white border-t border-slate-200/80 px-4 sm:px-5 py-3 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.99] cursor-pointer shadow-xs"
            >
              {t.closeBtn}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
