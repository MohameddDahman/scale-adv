/**
 * Starter content. Used by `seed:run` to fill a fresh deployment and by the
 * website as a fallback while Convex isn't connected yet.
 *
 * Client names, cities and follower counts come from the agency's client
 * list (Facebook page previews). Job posts, FAQs and stats are SAMPLES:
 * review them in the dashboard before launch.
 */
import type { ObjectType } from "convex/values";
import type {
  SettingsValue,
  Text,
  caseStudyFields,
  clientFields,
  faqFields,
  jobFields,
  reelFields,
  serviceFields,
} from "./validators";

const t = (en: string, ar: string): Text => ({ en, ar });

export const DEFAULT_SETTINGS: SettingsValue = {
  general: {
    agencyName: "SCALE ADV",
    tagline: t("Advertising agency", "وكالة إعلانات"),
    footerNote: t(
      "Performance marketing, content and production for brands that want to sell, not just post.",
      "تسويق بالأداء، محتوى، وإنتاج لبراندات عايزة تبيع، مش بس تنشر.",
    ),
  },
  hero: {
    eyebrow: t("Performance creative studio · Egypt", "استوديو محتوى إعلاني · مصر"),
    line1: t("We turn ads", "بنحوّل الإعلانات"),
    line2: t("into customers.", "لعملاء حقيقيين."),
    sub: t(
      "Content, production and media buying under one roof. Every reel is written to stop the scroll and built to sell.",
      "صناعة محتوى، إنتاج، وميديا باينج تحت سقف واحد. كل ريل بنكتبه عشان يوقّف السكرول، وبنبنيه عشان يبيع.",
    ),
    showTimeline: true,
  },
  stats: [
    { value: "12+", label: t("brands on our roster", "براند بنشتغل معاهم") },
    { value: "518K+", label: t("followers across our clients' pages", "متابع على صفحات عملائنا") },
    // Left blank (and hidden) until the real total is typed in: 18000000 shows as 18M+.
    { value: "", label: t("views across our clients' reels", "مشاهدة على ريلز عملائنا") },
  ],
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    address: t("Egypt", "مصر"),
    hours: t("", ""),
    mapUrl: "",
  },
  social: {
    instagram: "https://www.instagram.com/scale_adv/",
    facebook: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    behance: "",
  },
  careers: {
    accepting: true,
    intro: t(
      "SCALE is a small, fast team that writes, shoots, edits and runs ads for real brands. Everything you make goes live, and you'll see exactly how it performs.",
      "SCALE فريق صغير وسريع، بنكتب ونصوّر ونعمل مونتاج ونشغّل إعلانات لبراندات حقيقية. كل حاجة بتعملها بتنزل، وهتشوف بنفسك نتيجتها بالأرقام.",
    ),
    perks: [
      {
        title: t("Real brands, real briefs", "براندات حقيقية، بريفات حقيقية"),
        body: t(
          "You work on live accounts — menswear, furnishings, real estate, supplements — not mock projects.",
          "هتشتغل على حسابات شغّالة فعلًا — ملابس، مفروشات، عقارات، مكملات — مش مشاريع تجريبية.",
        ),
      },
      {
        title: t("See the numbers", "شوف الأرقام"),
        body: t(
          "Every piece of content runs through our ad accounts, so you learn what actually sells and why.",
          "كل محتوى بيتعمل بيتشغّل في حسابات الإعلانات، فهتتعلم إيه اللي بيبيع فعلًا وليه.",
        ),
      },
      {
        title: t("Script to screen", "من السكريبت للشاشة"),
        body: t(
          "Writers sit in on shoots and editors hear the brief first-hand. One team, start to finish.",
          "الكاتب بيحضر التصوير، والمونتير بيسمع البريف من أوله. فريق واحد من البداية للنهاية.",
        ),
      },
      {
        title: t("A portfolio that performs", "بورتفوليو بنتايج"),
        body: t(
          "Leave with work you can show — and the results to back it up.",
          "هتطلع بشغل تقدر تعرضه — ومعاه نتايج تثبته.",
        ),
      },
    ],
    steps: [
      {
        title: t("Apply", "قدّم"),
        body: t("Send the form with your CV and a link to your work. Five minutes, tops.", "ابعت الفورم مع السي ڤي ولينك لشغلك. خمس دقايق بالكتير."),
      },
      {
        title: t("Portfolio review", "مراجعة الشغل"),
        body: t("We look at what you've made before anything else.", "بنبص على شغلك قبل أي حاجة تانية."),
      },
      {
        title: t("Short call", "مكالمة قصيرة"),
        body: t("A quick conversation about the role and how you like to work.", "كلام سريع عن الدور وطريقة شغلك."),
      },
      {
        title: t("Test task", "مهمة تجريبية"),
        body: t("A small, real-world task close to what you'd do on the job.", "مهمة صغيرة قريبة من الشغل الحقيقي اللي هتعمله."),
      },
      {
        title: t("Offer", "العرض"),
        body: t("If it's a fit on both sides, we talk start date and terms.", "لو مناسبين لبعض، بنتكلم في ميعاد البداية والتفاصيل."),
      },
    ],
  },
  seo: {
    title: t(
      "SCALE ADV — Performance marketing & content agency in Egypt",
      "SCALE ADV — وكالة تسويق بالأداء وصناعة محتوى في مصر",
    ),
    description: t(
      "SCALE ADV writes, shoots and runs ads that sell. Content creation, media production and media buying for brands across Egypt.",
      "SCALE ADV بتكتب وتصوّر وتشغّل إعلانات بتبيع. صناعة محتوى، ميديا برودكشن، وميديا باينج لبراندات في كل مصر.",
    ),
  },
  announcement: {
    enabled: false,
    text: t("We're hiring video editors and media buyers.", "بنعيّن مونتيرين وميديا باييرز."),
    href: "/careers",
  },
};

type ServiceSeed = ObjectType<typeof serviceFields>;
export const DEFAULT_SERVICES: ServiceSeed[] = [
  {
    verb: t("Think", "نفكّر"),
    title: t("Content creation", "صناعة المحتوى"),
    summary: t(
      "Ideas, hooks and scripts written the way your customers actually talk. We plan the month, write every reel, and pick the format that fits — skits, POV, storytelling, street interviews or UGC.",
      "أفكار، هوكس، وسكريبتات مكتوبة بنفس طريقة كلام عملائك. بنخطط الشهر، ونكتب كل ريل، ونختار الفورمات المناسب — سكتشات، POV، ستوري تيلينج، لقاءات شارع، أو UGC.",
    ),
    deliverables: [
      t("Monthly content calendar", "خطة محتوى شهرية"),
      t("Hooks & scripts", "هوكس وسكريبتات"),
      t("Trend & format research", "متابعة التريندات والفورمات"),
      t("UGC & influencer briefs", "بريفات UGC وإنفلونسرز"),
      t("Captions & ad copy", "كابشنز وكوبي إعلاني"),
    ],
    published: true,
  },
  {
    verb: t("Shoot", "نصوّر"),
    title: t("Media production", "الميديا برودكشن"),
    summary: t(
      "Our crew directs, films and edits on location — your store, your factory, the street. Product shots, fashion lookbooks, reels and ad cuts, finished with motion graphics and sound.",
      "فريقنا بيخرج ويصوّر ويعمل المونتاج في مكانك — المحل، المصنع، أو الشارع. تصوير منتجات، لوك بوك فاشون، ريلز وإعلانات، ومعاها موشن جرافيك وصوت.",
    ),
    deliverables: [
      t("Directing & filming", "إخراج وتصوير"),
      t("Reel & ad edits", "مونتاج ريلز وإعلانات"),
      t("Product & fashion shoots", "تصوير منتجات وفاشون"),
      t("Motion graphics", "موشن جرافيك"),
      t("Photography", "فوتوغرافي"),
    ],
    published: true,
  },
  {
    verb: t("Scale", "نكبّر"),
    title: t("Media buying", "الميديا باينج"),
    summary: t(
      "We run the content as ads on Meta and TikTok, test hooks and audiences side by side, move budget to what sells, and report back in plain numbers.",
      "بنشغّل المحتوى كإعلانات على ميتا وتيك توك، ونختبر الهوكس والجماهير جنب بعض، ونحرّك الميزانية للي بيبيع، ونرجعلك بأرقام واضحة.",
    ),
    deliverables: [
      t("Meta & TikTok ads", "إعلانات ميتا وتيك توك"),
      t("Pixel & tracking setup", "إعداد البيكسل والتتبع"),
      t("Creative & audience testing", "اختبار الكرييتف والجمهور"),
      t("Budget scaling", "تكبير الميزانية"),
      t("Clear reporting", "تقارير واضحة"),
    ],
    published: true,
  },
];

type ClientSeed = ObjectType<typeof clientFields>;
const MAHALLA = t("El-Mahalla el-Kubra", "المحلة الكبرى");
const MENSWEAR = t("Menswear", "ملابس رجالي");
const client = (
  slug: string,
  name: Text,
  industry: Text,
  city: Text,
  followers?: number,
): ClientSeed => ({
  slug,
  name,
  industry,
  city,
  logoPath: `/clients/${slug}.webp`,
  followers,
  featured: true,
  published: true,
});

export const DEFAULT_CLIENTS: ClientSeed[] = [
  client("mohsen", t("Mohsen Stores", "تيشرتات محسن"), MENSWEAR, MAHALLA, 174179),
  client("spiketo-luxury", t("Spiketo Luxury", "سبايكيتو لاكشري"), t("Premium menswear", "ملابس رجالي بريميوم"), t("Ships nationwide", "شحن لكل مصر"), 146240),
  client("um-el-saad", t("Um El Saad Furnishings", "مفروشات أم السعد"), t("Home furnishings", "مفروشات"), MAHALLA, 84399),
  client("spiketo", t("Spiketo Store", "سبايكيتو ستور"), MENSWEAR, MAHALLA, 38481),
  client("lio-women", t("Lio Women", "ليو وومن"), t("Womenswear", "ملابس حريمي"), MAHALLA, 29026),
  client("apache", t("Apache Men's Wear", "أباتشي"), MENSWEAR, MAHALLA, 15492),
  client("baiomy", t("Baiomy Store", "بيومي ستور"), MENSWEAR, MAHALLA, 12970),
  client("avva", t("Avva Men's Wear", "أڤا"), MENSWEAR, MAHALLA, 7818),
  client("al-azab", t("Al Azab", "مكتب العزب"), t("Ready-to-wear", "ملابس جاهزة"), MAHALLA, 4636),
  client("mo-zoro", t("MO ZORO", "مو زورو"), t("Fashion", "فاشون"), MAHALLA, 3262),
  client(
    "doctor-supplement",
    t("Doctor Supplement", "دكتور سبلمنت"),
    t("Sports supplements", "مكملات غذائية"),
    t("Mansoura · Mahalla · Sinbellawein", "المنصورة · المحلة · السنبلاوين"),
    2150,
  ),
  client("elkasas", t("Elkasas Real Estate", "القصاص للاستثمار العقاري"), t("Construction & real estate", "مقاولات وتطوير عقاري"), t("Tanta", "طنطا")),
];

type ReelSeed = ObjectType<typeof reelFields> & { clientSlug?: string };

/** A reel whose video is stored on the client's Cloudinary account (shrunk to 720p before upload). */
const cloudinaryReel = (
  slug: string,
  version: number,
  bytes: number,
  duration: number,
  reel: Omit<ReelSeed, "videoUrl" | "videoPublicId" | "videoBytes" | "videoDuration" | "posterPath" | "featured" | "published">,
): ReelSeed => ({
  ...reel,
  videoUrl: `https://res.cloudinary.com/du4z7z8s/video/upload/v${version}/scale-adv/reels/${slug}.mp4`,
  videoPublicId: `scale-adv/reels/${slug}`,
  videoBytes: bytes,
  videoDuration: duration,
  posterPath: `/work/${slug}.webp`,
  featured: true,
  published: true,
});

/**
 * The client's real work, from the Content and Production folders they sent.
 * Titles describe what's on screen; the client can rename them in the dashboard.
 * The Spiketo videos are credited to Spiketo Luxury (designer labels).
 */
export const DEFAULT_REELS: ReelSeed[] = [
  cloudinaryReel("mohsen-cafe-to-store", 1795179326, 9288315, 70.3, {
    title: t("Mohsen: from the café to the store", "محسن: من القهوة للمحل"),
    format: "storytelling",
    category: "production",
    clientSlug: "mohsen",
  }),
  cloudinaryReel("spiketo-dolce-gabbana", 1795179295, 3654062, 20.7, {
    title: t("Dolce & Gabbana trousers, up close", "بنطلون دولتشي آند جابانا من قريب"),
    format: "product",
    category: "content",
    clientSlug: "spiketo-luxury",
  }),
  cloudinaryReel("mohsen-where-next", 1795179338, 3044303, 28.8, {
    title: t("Where will Mohsen open next?", "تفتكروا محسن هيفتح فين؟"),
    format: "skit",
    category: "production",
    clientSlug: "mohsen",
  }),
  cloudinaryReel("spiketo-prada", 1795179302, 3179433, 21.7, {
    title: t("Prada trousers, every detail", "بنطلون برادا بكل تفاصيله"),
    format: "product",
    category: "content",
    clientSlug: "spiketo-luxury",
  }),
  cloudinaryReel("spiketo-store-tour", 1795179357, 9758186, 58.8, {
    title: t("Inside Spiketo", "جولة جوه سبايكيتو"),
    format: "product",
    category: "production",
    clientSlug: "spiketo-luxury",
  }),
  cloudinaryReel("mohsen-opening-night", 1795179332, 2923341, 28.3, {
    title: t("Mohsen: opening night", "محسن: ليلة الافتتاح"),
    format: "ad",
    category: "production",
    clientSlug: "mohsen",
  }),
  cloudinaryReel("spiketo-denim", 1795179307, 1885661, 11.7, {
    title: t("Dark denim, up close", "جينز غامق من قريب"),
    format: "product",
    category: "content",
    clientSlug: "spiketo-luxury",
  }),
];

/** Covers of the placeholder reels the site started with (stills from Instagram), hidden once real reels were added. */
export const PLACEHOLDER_REEL_POSTERS = ["/work/pov-manager.webp", "/work/pov-office.webp", "/work/skit-ladder.webp"];

type FaqSeed = ObjectType<typeof faqFields>;
export const DEFAULT_FAQS: FaqSeed[] = [
  {
    scope: "services",
    question: t("What do you need from me to get started?", "محتاجين مني إيه عشان نبدأ؟"),
    answer: t(
      "A short call about your product, your customers and your current numbers. Then we come back with a content plan, the first scripts and a suggested ad budget.",
      "مكالمة قصيرة عن منتجك وعملائك وأرقامك الحالية. بعدها بنرجعلك بخطة محتوى، وأول سكريبتات، وميزانية إعلانات مقترحة.",
    ),
    published: true,
  },
  {
    scope: "services",
    question: t("Do you only run ads, or do you make the content too?", "إنتوا بتشغّلوا إعلانات بس، ولا بتعملوا المحتوى كمان؟"),
    answer: t(
      "Both. We write, shoot and edit the content ourselves, then run it as ads. One team owns the result, so nothing gets lost between agencies.",
      "الاتنين. بنكتب ونصوّر ونعمل المونتاج بنفسنا، وبعدين بنشغّله كإعلانات. فريق واحد مسؤول عن النتيجة، فمفيش حاجة بتضيع بين وكالات.",
    ),
    published: true,
  },
  {
    scope: "services",
    question: t("Which platforms do you advertise on?", "بتعلنوا على أنهي منصات؟"),
    answer: t(
      "Mostly Meta (Facebook and Instagram) and TikTok — where your customers actually scroll. If another channel suits your product better, we'll say so.",
      "غالبًا ميتا (فيسبوك وإنستجرام) وتيك توك — المكان اللي عملاءك بيقضوا فيه وقتهم فعلًا. ولو فيه منصة تانية أنسب لمنتجك هنقولك.",
    ),
    published: true,
  },
  {
    scope: "services",
    question: t("Do I need a big ad budget?", "لازم يكون عندي ميزانية إعلانات كبيرة؟"),
    answer: t(
      "No. We size the budget to your goal, start where testing is affordable, and scale only what's already working.",
      "لأ. بنحدد الميزانية حسب هدفك، ونبدأ بمبلغ مناسب للاختبار، ونكبّر بس اللي أثبت إنه شغّال.",
    ),
    published: true,
  },
  {
    scope: "services",
    question: t("Can you shoot at our store or factory?", "ممكن تصوّروا في المحل أو المصنع بتاعنا؟"),
    answer: t(
      "Yes. Most of our shoots happen where the product lives — in-store, on the factory floor or out on the street.",
      "أيوه. أغلب التصوير بيكون في مكان المنتج نفسه — في المحل، في المصنع، أو في الشارع.",
    ),
    published: true,
  },
  {
    scope: "careers",
    question: t("Do I need professional experience?", "لازم يكون عندي خبرة؟"),
    answer: t(
      "Not for internships or talent roles. For everything else, your portfolio matters more than your CV.",
      "مش شرط في التدريب أو أدوار المواهب. في باقي الأدوار، شغلك أهم من السي ڤي.",
    ),
    published: true,
  },
  {
    scope: "careers",
    question: t("What should my portfolio include?", "البورتفوليو المفروض يكون فيه إيه؟"),
    answer: t(
      "Links to work you made or contributed to — reels, ads, edits, scripts. Tell us which part was yours.",
      "لينكات لشغل عملته أو شاركت فيه — ريلز، إعلانات، مونتاج، سكريبتات. وقولنا إنت عملت أنهي جزء.",
    ),
    published: true,
  },
  {
    scope: "careers",
    question: t("How will I hear back?", "هعرف الرد إزاي؟"),
    answer: t(
      "We read every application. If your profile fits an open role, we'll contact you on WhatsApp or by email.",
      "بنقرا كل طلب. لو مناسب لدور متاح، هنتواصل معاك على واتساب أو الإيميل.",
    ),
    published: true,
  },
];

type JobSeed = ObjectType<typeof jobFields>;
const ONSITE = t("Egypt", "مصر");
const SALARY = t("Discussed after the portfolio review", "بيتحدد بعد مراجعة الشغل");

export const DEFAULT_JOBS: JobSeed[] = [
  {
    slug: "video-editor",
    title: t("Video Editor — Reels & Ads", "مونتير ريلز وإعلانات"),
    department: "production",
    type: "full_time",
    workplace: "onsite",
    location: ONSITE,
    summary: t(
      "Cut reels and ad variations that hold attention past the first three seconds. You'll work straight from the script and the shoot, and see how every cut performs.",
      "هتعمل مونتاج ريلز ونسخ إعلانات تشد الانتباه بعد أول ٣ ثواني. هتشتغل من السكريبت والتصوير مباشرة، وهتشوف أداء كل قطعة بالأرقام.",
    ),
    responsibilities: [
      t("Edit short-form reels and ads for Instagram, Facebook and TikTok", "مونتاج ريلز وإعلانات قصيرة لإنستجرام وفيسبوك وتيك توك"),
      t("Build hook and length variations for ad testing", "عمل نسخ مختلفة من الهوك والطول لاختبار الإعلانات"),
      t("Add captions, sound design and simple motion graphics", "إضافة كابشنز، ساوند ديزاين، وموشن جرافيك بسيط"),
      t("Keep projects and footage organised for fast turnarounds", "تنظيم المشاريع والفوتيج عشان التسليم يبقى سريع"),
    ],
    requirements: [
      t("A portfolio of short-form edits (reels, TikToks or ads)", "بورتفوليو فيه مونتاج محتوى قصير (ريلز، تيك توك، أو إعلانات)"),
      t("Confident in Premiere Pro, CapCut or DaVinci Resolve", "إتقان بريمير أو كاب كات أو دافنشي ريزولف"),
      t("A sense of pacing and humour that fits Egyptian audiences", "إحساس بالإيقاع والكوميديا يناسب الجمهور المصري"),
    ],
    niceToHave: [
      t("After Effects or motion design basics", "أساسيات أفتر إفكتس أو الموشن"),
      t("Experience editing paid ads", "خبرة في مونتاج الإعلانات الممولة"),
    ],
    perks: [
      t("Work on live brand accounts from day one", "شغل على حسابات براندات حقيقية من أول يوم"),
      t("See the ad results for every edit you make", "هتشوف نتايج الإعلانات لكل مونتاج بتعمله"),
    ],
    salary: SALARY,
    questions: [
      { id: "q1", label: t("Link to the edit you're proudest of", "لينك لأكتر مونتاج فخور بيه"), kind: "url", required: true },
      {
        id: "q2",
        label: t("Which editing software do you use daily?", "بتستخدم أنهي برنامج مونتاج يوميًا؟"),
        kind: "select",
        options: [t("Premiere Pro", "بريمير برو"), t("CapCut", "كاب كات"), t("DaVinci Resolve", "دافنشي ريزولف"), t("Final Cut Pro", "فاينال كت"), t("Other", "غير ذلك")],
        required: true,
      },
    ],
    status: "open",
    featured: true,
  },
  {
    slug: "content-creator-scriptwriter",
    title: t("Content Creator & Scriptwriter", "كونتنت كرييتور وكاتب سكريبت"),
    department: "content",
    type: "full_time",
    workplace: "onsite",
    location: ONSITE,
    summary: t(
      "Turn product briefs into hooks, skits and scripts people want to finish. You'll pitch the ideas, write the scripts and be on set when they're shot.",
      "حوّل بريف المنتج لهوكس وسكتشات وسكريبتات الناس تحب تكمّلها. هتقترح الأفكار، تكتب السكريبتات، وتكون موجود في التصوير.",
    ),
    responsibilities: [
      t("Write scripts for reels, skits and ads across several brands", "كتابة سكريبتات ريلز وسكتشات وإعلانات لأكتر من براند"),
      t("Pitch monthly content ideas and formats", "اقتراح أفكار وفورمات المحتوى كل شهر"),
      t("Track trends and adapt them to each brand's voice", "متابعة التريندات وتطويعها لصوت كل براند"),
      t("Direct talent on set when needed", "توجيه الممثلين في التصوير عند الحاجة"),
    ],
    requirements: [
      t("Writing samples or content you've created", "نماذج كتابة أو محتوى عملته قبل كده"),
      t("Excellent Egyptian Arabic copy and good English", "كتابة عامية مصرية ممتازة وإنجليزي كويس"),
      t("You know what makes people stop scrolling — and can explain why", "عارف إيه اللي بيخلي الناس توقف السكرول — وتقدر تشرح ليه"),
    ],
    niceToHave: [t("Comfortable on camera", "مرتاح قدام الكاميرا"), t("Basic editing skills", "أساسيات مونتاج")],
    perks: [
      t("Your scripts get shot and published", "سكريبتاتك بتتصوّر وتتنشر فعلًا"),
      t("Direct feedback from ad performance", "فيدباك مباشر من أداء الإعلانات"),
    ],
    salary: SALARY,
    questions: [
      { id: "q1", label: t("Share a reel or post you wrote (link)", "شاركنا لينك لريل أو بوست إنت كاتبه"), kind: "url", required: true },
      {
        id: "q2",
        label: t("Write a 3-second hook for a menswear store's winter collection", "اكتب هوك ٣ ثواني لكولكشن شتوي لمحل ملابس رجالي"),
        kind: "long",
        required: true,
      },
    ],
    status: "open",
    featured: true,
  },
  {
    slug: "media-buyer",
    title: t("Media Buyer — Meta & TikTok", "ميديا باير — ميتا وتيك توك"),
    department: "media_buying",
    type: "full_time",
    workplace: "hybrid",
    location: ONSITE,
    summary: t(
      "Plan, launch and scale paid campaigns for online stores and local shops. You'll sit next to the people who make the creatives, so testing is fast.",
      "خطط وأطلق وكبّر حملات ممولة لمتاجر أونلاين ومحلات. هتشتغل جنب الفريق اللي بيعمل الكرييتف، فالاختبار بيبقى سريع.",
    ),
    responsibilities: [
      t("Build and manage campaigns in Meta Ads Manager and TikTok Ads", "إنشاء وإدارة الحملات على ميتا وتيك توك"),
      t("Set up pixels, events and conversion tracking", "إعداد البيكسل والأحداث وتتبع التحويلات"),
      t("Run structured creative and audience tests", "عمل اختبارات منظمة للكرييتف والجمهور"),
      t("Report results clearly to clients and the team", "عرض النتايج بوضوح للعميل والفريق"),
    ],
    requirements: [
      t("1+ year managing real ad budgets", "خبرة سنة على الأقل في إدارة ميزانيات إعلانية حقيقية"),
      t("Comfortable with ROAS, CPA, CTR and frequency", "فاهم ROAS و CPA و CTR والفريكونسي"),
      t("Strong spreadsheet skills", "شاطر في الإكسيل والشيتس"),
    ],
    niceToHave: [
      t("E-commerce experience (Shopify, WooCommerce)", "خبرة مع متاجر أونلاين (شوبيفاي، ووكومرس)"),
      t("Google Ads basics", "أساسيات جوجل أدز"),
    ],
    perks: [
      t("Direct line to the creative team", "تواصل مباشر مع فريق الكرييتف"),
      t("Accounts across very different industries", "حسابات في مجالات مختلفة جدًا"),
    ],
    salary: SALARY,
    questions: [
      { id: "q1", label: t("Largest monthly budget you've managed (EGP)", "أكبر ميزانية شهرية أدرتها (بالجنيه)"), kind: "short", required: true },
      { id: "q2", label: t("Do you hold a Meta Blueprint or similar certification?", "معاك شهادة Meta Blueprint أو ما يشابهها؟"), kind: "yesno", required: false },
    ],
    status: "open",
    featured: true,
  },
  {
    slug: "videographer",
    title: t("Videographer / Content Shooter", "مصوّر فيديو وكونتنت"),
    department: "production",
    type: "full_time",
    workplace: "onsite",
    location: ONSITE,
    summary: t(
      "Shoot reels, product videos and behind-the-scenes on location with a small crew. Good light, steady hands, fast setups.",
      "صوّر ريلز وفيديوهات منتجات وكواليس في مواقع مختلفة مع فريق صغير. إضاءة كويسة، إيد ثابتة، وتجهيز سريع.",
    ),
    responsibilities: [
      t("Film reels, ads and product content on location", "تصوير ريلز وإعلانات ومحتوى منتجات في المواقع"),
      t("Light small spaces like stores and showrooms", "إضاءة أماكن صغيرة زي المحلات والمعارض"),
      t("Capture clean audio for dialogue and skits", "تسجيل صوت نضيف للحوار والسكتشات"),
      t("Back up and hand over footage the same day", "عمل باك أب للفوتيج وتسليمه في نفس اليوم"),
    ],
    requirements: [
      t("A showreel or portfolio of vertical video", "شوريل أو بورتفوليو فيديو رأسي"),
      t("Hands-on with mirrorless cameras, gimbals and lights", "خبرة عملية بالكاميرات الميررليس والجيمبال والإضاءة"),
      t("Available for shoot days on location", "متاح لأيام تصوير خارجية"),
    ],
    niceToHave: [t("Drone or phone cinematography", "تصوير درون أو موبايل احترافي"), t("Basic editing", "أساسيات مونتاج")],
    perks: [t("Shoots across fashion, furnishings and real estate", "تصوير متنوع بين الفاشون والمفروشات والعقارات")],
    salary: SALARY,
    questions: [
      { id: "q1", label: t("Link to your showreel", "لينك الشوريل بتاعك"), kind: "url", required: true },
      { id: "q2", label: t("Do you own your own camera kit?", "عندك معدات تصوير خاصة بيك؟"), kind: "yesno", required: false },
    ],
    status: "open",
    featured: false,
  },
  {
    slug: "marketing-intern",
    title: t("Marketing Intern", "متدرب تسويق"),
    department: "content",
    type: "internship",
    workplace: "onsite",
    location: ONSITE,
    summary: t(
      "Three months inside a working agency: research, scripts, shoots and ad reports. For students and fresh graduates who learn by doing.",
      "تلات شهور جوه وكالة شغّالة: ريسيرش، سكريبتات، تصوير، وتقارير إعلانات. لطلاب وخريجين جداد بيتعلموا بالتجربة.",
    ),
    responsibilities: [
      t("Research competitors, trends and audiences", "ريسيرش عن المنافسين والتريندات والجمهور"),
      t("Help prepare shoots and content calendars", "المساعدة في تجهيز التصوير وخطط المحتوى"),
      t("Pull the numbers for ad reports", "تجميع الأرقام لتقارير الإعلانات"),
    ],
    requirements: [
      t("Student or recent graduate, any major", "طالب أو خريج حديث، أي تخصص"),
      t("Curious, organised and quick to learn", "فضولي ومنظم وبتتعلم بسرعة"),
      t("Active on Instagram and TikTok", "متابع نشط لإنستجرام وتيك توك"),
    ],
    niceToHave: [t("Canva or basic design skills", "كانڤا أو أساسيات تصميم")],
    perks: [t("Hands-on time in every department", "تدريب عملي في كل الأقسام")],
    salary: t("Internship", "تدريب"),
    questions: [
      { id: "q1", label: t("University and year", "الجامعة والسنة الدراسية"), kind: "short", required: true },
      {
        id: "q2",
        label: t("Which team interests you most?", "أنهي قسم مهتم بيه أكتر؟"),
        kind: "select",
        options: [t("Content", "المحتوى"), t("Production", "الإنتاج"), t("Media buying", "الميديا باينج")],
        required: true,
      },
    ],
    status: "open",
    featured: false,
  },
  {
    slug: "on-camera-talent",
    title: t("On-camera Talent — Actors & Models", "مواهب أمام الكاميرا — ممثلين وموديلز"),
    department: "production",
    type: "talent",
    workplace: "onsite",
    location: ONSITE,
    summary: t(
      "Join our talent pool for skits, product reels and fashion shoots. No agency representation needed.",
      "انضم لقائمة المواهب بتاعتنا للسكتشات وريلز المنتجات وتصوير الفاشون. مش محتاج تكون تبع وكالة.",
    ),
    responsibilities: [
      t("Act in comedy skits and POV reels", "التمثيل في سكتشات كوميدي وريلز POV"),
      t("Model for fashion and product shoots", "موديل لتصوير الفاشون والمنتجات"),
      t("Take direction and do multiple takes", "الالتزام بالتوجيهات وإعادة اللقطات"),
    ],
    requirements: [
      t("Comfortable and natural on camera", "طبيعي ومرتاح قدام الكاميرا"),
      t("Available for daytime shoots", "متاح للتصوير بالنهار"),
      t("18 years or older", "سنك ١٨ سنة أو أكتر"),
    ],
    niceToHave: [
      t("Acting, theatre or modelling experience", "خبرة تمثيل أو مسرح أو موديلينج"),
      t("An active social media presence", "حساب سوشيال ميديا نشط"),
    ],
    perks: [
      t("Paid shoot days", "أيام تصوير مدفوعة"),
      t("Appear on brands with large audiences", "ظهور مع براندات ليها جمهور كبير"),
    ],
    salary: t("Per shoot day", "بالأجر اليومي للتصوير"),
    questions: [
      { id: "q1", label: t("Instagram or TikTok handle", "حسابك على إنستجرام أو تيك توك"), kind: "short", required: true },
      { id: "q2", label: t("Age", "السن"), kind: "short", required: true },
      {
        id: "q3",
        label: t("What are you applying for?", "بتقدّم على إيه؟"),
        kind: "select",
        options: [t("Acting", "تمثيل"), t("Modelling", "موديلينج"), t("Both", "الاتنين")],
        required: true,
      },
    ],
    status: "open",
    featured: false,
  },
];

type CaseStudySeed = ObjectType<typeof caseStudyFields> & { clientSlug?: string };
export const DEFAULT_CASE_STUDIES: CaseStudySeed[] = [
  {
    slug: "mohsen-a-new-chapter",
    clientSlug: "mohsen",
    title: t("Mohsen Stores — a new chapter", "تيشرتات محسن — فصل جديد"),
    summary: t(
      "EXAMPLE ENTRY — replace this text and the numbers with the real story before publishing.",
      "مثال — استبدل النص والأرقام بالقصة الحقيقية قبل النشر.",
    ),
    challenge: t("What was the brand struggling with before SCALE?", "إيه المشكلة اللي كان البراند بيواجهها قبل SCALE؟"),
    approach: t("What did we write, shoot and run?", "إيه اللي كتبناه وصوّرناه وشغّلناه؟"),
    outcome: t("What changed, in numbers?", "إيه اللي اتغيّر بالأرقام؟"),
    metrics: [
      { label: t("Followers", "المتابعين"), before: "—", after: "174K" },
      { label: t("Return on ad spend", "العائد على الإعلان"), before: "—", after: "—" },
    ],
    coverPath: "/clients/mohsen.webp",
    reelIds: [],
    services: ["content", "production", "media_buying"],
    featured: true,
    published: false,
  },
];
