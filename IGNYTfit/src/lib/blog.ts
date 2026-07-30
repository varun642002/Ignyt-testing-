/**
 * Blog content.
 *
 * Articles are typed content blocks rather than MDX. That keeps the whole blog
 * inside the type system — a malformed post is a build error, not a runtime
 * surprise — and avoids pulling an MDX toolchain into a site that renders
 * fewer than a dozen articles.
 *
 * Every article is general fitness education, not medical advice; the article
 * layout appends a standing disclaimer and links to /disclaimer.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; title: string; text: string }
  | { type: "quote"; text: string };

export type Category =
  | "Nutrition"
  | "Training"
  | "Body composition"
  | "Fasting"
  | "Hydration"
  | "Recovery";

export interface Post {
  slug: string;
  title: string;
  /** Meta description and card summary. Keep under ~160 characters. */
  description: string;
  category: Category;
  /** ISO date. */
  published: string;
  /** Rounded reading time in minutes. */
  readingMinutes: number;
  /** Search keywords specific to this article. */
  keywords: string[];
  body: Block[];
}

export const categories: Category[] = [
  "Nutrition",
  "Training",
  "Body composition",
  "Fasting",
  "Hydration",
  "Recovery",
];

export const posts: Post[] = [
  {
    slug: "how-much-protein-do-you-actually-need",
    title: "How much protein do you actually need?",
    description:
      "Protein targets are usually quoted per day, which hides the number that matters. Here is how to set one per kilogram of bodyweight, and how to hit it.",
    category: "Nutrition",
    published: "2026-07-12",
    readingMinutes: 6,
    keywords: [
      "protein intake",
      "protein per kg",
      "how much protein",
      "muscle protein synthesis",
    ],
    body: [
      {
        type: "p",
        text: "Most nutrition apps give you a protein target in grams per day and leave it there. That number is close to meaningless on its own: 140 g is generous for a 60 kg runner and thin for a 95 kg lifter. The useful figure is protein per kilogram of bodyweight, which is why IGNYT shows it that way.",
      },
      { type: "h2", text: "The ranges most people land in" },
      {
        type: "p",
        text: "Published intake guidance clusters into a few broad bands. Treat these as starting points to test against your own results, not as prescriptions.",
      },
      {
        type: "ul",
        items: [
          "Sedentary maintenance: around 0.8 g per kg — enough to avoid deficiency, not enough to support hard training.",
          "General training and recomposition: roughly 1.4–1.8 g per kg is where most recommendations for active people sit.",
          "Dieting in a calorie deficit: toward the upper end, often 1.8–2.2 g per kg, because protein needs rise as calories fall and preserving lean mass matters more.",
          "Older adults: needs trend higher than the sedentary baseline, as the same dose of protein produces a smaller response.",
        ],
      },
      {
        type: "callout",
        title: "The deficit is the special case",
        text: "When you are eating less, protein is doing two jobs: supporting training and protecting the muscle you already have. That is the one situation where pushing intake up reliably earns its place.",
      },
      { type: "h2", text: "Total intake beats timing" },
      {
        type: "p",
        text: "The anabolic window has been oversold. Distributing protein reasonably across the day is sensible and easier to digest, but the single biggest lever is the daily total. Someone hitting their target across three meals will do better than someone missing it across six perfectly timed ones.",
      },
      {
        type: "p",
        text: "A practical distribution is three to four servings of 25–40 g. Beyond that, precision has diminishing returns compared with just consistently reaching the number.",
      },
      { type: "h2", text: "Why people miss the target" },
      {
        type: "ol",
        items: [
          "Breakfast. It is the meal most likely to be carbohydrate-only, and the easiest place to add 25 g.",
          "Underestimating portions. Cooked and raw weights differ substantially; log the state you actually ate.",
          "Counting the whole dish. A curry is not 30 g of protein because it contains chicken — log the components.",
          "Weekends. Adherence data almost always dips on Saturday and Sunday, and a weekly average hides it.",
        ],
      },
      { type: "h2", text: "Tracking it without the tedium" },
      {
        type: "p",
        text: "You do not need to weigh food forever. Two weeks of accurate logging teaches you what 30 g of protein looks like on a plate, and after that you are calibrating rather than measuring. IGNYT shows protein per kilogram on the dashboard and charts the seven-day average, which smooths out the single unusual day that would otherwise look like failure.",
      },
    ],
  },
  {
    slug: "progressive-overload-without-a-spreadsheet",
    title: "Progressive overload without a spreadsheet",
    description:
      "Adding weight to the bar is only one of five ways to progress. Here is how to apply the others when the obvious one stops working.",
    category: "Training",
    published: "2026-06-28",
    readingMinutes: 7,
    keywords: [
      "progressive overload",
      "training volume",
      "how to progress lifting",
      "strength training progression",
    ],
    body: [
      {
        type: "p",
        text: "Progressive overload gets flattened into one instruction — add weight — which works for about three months and then quietly stops. When it does, most people conclude they have plateaued. Usually they have just run out of the only progression method they were using.",
      },
      { type: "h2", text: "Five ways to add stimulus" },
      {
        type: "ol",
        items: [
          "Load: more weight for the same reps. The obvious one, and the first to stall.",
          "Reps: same weight, more repetitions. Add one rep per set before you add a plate.",
          "Sets: more working sets per muscle per week. The most reliable long-run lever, up to a point.",
          "Tempo and control: slower eccentrics, a pause at the hardest position. More stimulus at the same load.",
          "Range of motion: a deeper squat is a harder squat at the same weight.",
        ],
      },
      {
        type: "callout",
        title: "Pick one at a time",
        text: "Changing load, reps and tempo in the same session tells you nothing about which one worked. Move one variable per block and let the log answer the question.",
      },
      { type: "h2", text: "Double progression, in practice" },
      {
        type: "p",
        text: "Set a rep range rather than a rep target — say 8 to 12. Stay at the same load until you hit the top of the range on every set, then add the smallest available increment and drop back to the bottom of the range. It is unglamorous and it works for years.",
      },
      {
        type: "quote",
        text: "Three sets of eight at 70 kg, then nine, then ten, then twelve — then 72.5 kg and back to eight. That is the whole method.",
      },
      { type: "h2", text: "Watch volume, not just the top set" },
      {
        type: "p",
        text: "A session where you hit a heavy single and stopped can be less total work than a lighter session with more sets. Weekly volume — sets multiplied by reps multiplied by load — is the number that tracks with progress over a training block, and it is the one most people never look at.",
      },
      {
        type: "p",
        text: "This is where automatic logging earns its place. IGNYT totals session volume as you tick sets off and charts it across twelve weeks, so the trend is visible without a spreadsheet.",
      },
      { type: "h2", text: "When to stop pushing" },
      {
        type: "ul",
        items: [
          "Reps at a given load falling for two consecutive sessions on the same lift.",
          "Warm-up sets feeling disproportionately heavy for more than a week.",
          "Sleep and appetite dropping while training load climbs.",
        ],
      },
      {
        type: "p",
        text: "None of these mean stop training. They mean hold the load, cut a set or two, and let recovery catch up. A deload week costs you nothing over a year and prevents the injuries that cost months.",
      },
    ],
  },
  {
    slug: "why-your-weight-jumps-overnight",
    title: "Why your weight jumps two kilos overnight",
    description:
      "Daily scale weight is mostly water, food volume and glycogen. Here is what the noise is made of and how to read the signal underneath it.",
    category: "Body composition",
    published: "2026-06-10",
    readingMinutes: 5,
    keywords: [
      "weight fluctuation",
      "scale weight",
      "water weight",
      "weight trend tracking",
    ],
    body: [
      {
        type: "p",
        text: "You did everything right, and the scale is up 1.8 kg. You did not gain 1.8 kg of fat overnight — that would require eating roughly 14,000 kcal above maintenance. What changed is almost entirely water and gut content.",
      },
      { type: "h2", text: "What the daily number is made of" },
      {
        type: "ul",
        items: [
          "Glycogen and its water. Each gram of stored carbohydrate holds roughly three grams of water, so a high-carbohydrate day can add a kilo or more with no change in fat mass.",
          "Sodium. A salty meal shifts water retention for a day or two.",
          "Food still in transit. Yesterday's food has mass until it leaves.",
          "Training. Hard sessions cause inflammation and fluid retention in the worked muscles — often visible for 24 to 72 hours.",
          "Hormonal cycles, which can move fluid balance by a kilo or more across a month.",
        ],
      },
      {
        type: "callout",
        title: "The useful comparison",
        text: "Compare this week's average with last week's average, never today with yesterday. A single reading is noise; seven of them are a measurement.",
      },
      { type: "h2", text: "Weighing in consistently" },
      {
        type: "ol",
        items: [
          "Same time of day — first thing in the morning is easiest to repeat.",
          "After using the bathroom, before eating or drinking.",
          "Same clothing, or none.",
          "Every day if you can stand it. More readings make the trend line more honest, not less.",
        ],
      },
      { type: "h2", text: "Reading the trend" },
      {
        type: "p",
        text: "A smoothed trend line turns a jagged daily chart into something you can actually make decisions from. If the trend has not moved in three weeks and you are trying to lose weight, that is signal. If yesterday was up 900 g, that is not.",
      },
      {
        type: "p",
        text: "IGNYT charts the smoothed 90-day trend rather than the raw daily line, and tracks body fat, lean mass and tape measurements alongside it — because scale weight alone cannot distinguish between the two outcomes you actually care about.",
      },
      { type: "h2", text: "When the scale is the wrong tool" },
      {
        type: "p",
        text: "If you are new to lifting or returning after a break, you can gain muscle and lose fat simultaneously, and the scale will sit still for months while your body composition changes substantially. Tape measurements and photographs are the better instrument in that period.",
      },
    ],
  },
  {
    slug: "intermittent-fasting-what-it-does",
    title: "Intermittent fasting: what it does and what it does not",
    description:
      "Fasting is an eating schedule, not a metabolic trick. What the window actually changes, who it suits, and who should avoid it.",
    category: "Fasting",
    published: "2026-05-22",
    readingMinutes: 6,
    keywords: [
      "intermittent fasting",
      "16:8 fasting",
      "fasting window",
      "time restricted eating",
    ],
    body: [
      {
        type: "p",
        text: "Intermittent fasting is a schedule, not a mechanism. Its main effect for most people is straightforward: a shorter eating window tends to mean fewer eating occasions, which tends to mean fewer calories. That is a legitimate and useful thing for a tool to do — it is just not magic.",
      },
      { type: "h2", text: "The common protocols" },
      {
        type: "ul",
        items: [
          "16:8 — a sixteen-hour fast and an eight-hour eating window. The most widely used, and the easiest to fit around a normal day.",
          "14:10 — gentler, and often a better starting point if you train in the morning.",
          "5:2 — normal eating five days a week, substantially reduced intake on two.",
        ],
      },
      {
        type: "callout",
        title: "What it does not do",
        text: "Fasting does not by itself burn fat faster at equal calories, and it does not detoxify anything — your liver and kidneys handle that continuously, fed or fasted.",
      },
      { type: "h2", text: "Where it genuinely helps" },
      {
        type: "ol",
        items: [
          "Structure. A rule you can follow beats a calorie target you negotiate with all evening.",
          "Late-night eating. For people whose intake problem is after 9pm, closing the window solves it directly.",
          "Fewer decisions. Skipping a meal removes a daily set of choices, which for some people is the entire benefit.",
        ],
      },
      { type: "h2", text: "Where it does not" },
      {
        type: "p",
        text: "If you train hard and need substantial daily protein, compressing intake into eight hours can make hitting your target genuinely difficult. Fasting also does not pair well with high training volume for everyone — the session quality drop is real if you routinely train fasted and under-fuelled.",
      },
      { type: "h2", text: "Who should not fast without medical supervision" },
      {
        type: "ul",
        items: [
          "Anyone pregnant or breastfeeding.",
          "Anyone under 18.",
          "Anyone with a history of disordered eating — restriction-based rules can be actively harmful here.",
          "People with diabetes or on medication that must be taken with food.",
        ],
      },
      {
        type: "p",
        text: "This is general information, not medical advice. Speak to a qualified professional before changing how you eat if any of the above applies to you.",
      },
      {
        type: "p",
        text: "If you do fast, tracking it removes the guesswork about whether you are actually keeping the window. IGNYT runs a live countdown, shows the current stage, and keeps a history of completed fasts so adherence is a number rather than an impression.",
      },
    ],
  },
];

/** Newest first. */
export const sortedPosts = [...posts].sort(
  (a, b) => Date.parse(b.published) - Date.parse(a.published),
);

export function getPost(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}

/** Categories that actually have at least one article. */
export const usedCategories = categories.filter((category) =>
  posts.some((post) => post.category === category),
);

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
