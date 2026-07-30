import type { AccordionItem } from "@/components/ui/Accordion";

export interface FaqGroup {
  id: string;
  label: string;
  items: AccordionItem[];
}

/**
 * Contact-page FAQ, grouped by topic.
 *
 * Answers are written to be true of the shipping app — they double as the
 * source for the `FAQPage` structured data, so anything inaccurate here would
 * be inaccurate in search results too.
 */
export const faqGroups: FaqGroup[] = [
  {
    id: "authentication",
    label: "Authentication",
    items: [
      {
        question: "Do I need an account to use IGNYT?",
        answer:
          "No. Every core feature works without signing in. An account exists only so cloud backup and multi-device sync are possible — skip it and everything stays on your device.",
      },
      {
        question: "What does Google Sign-In give you access to?",
        answer:
          "Your name, email address and profile photograph, used to identify your account and to scope your cloud data to you. IGNYT never sees your Google password and requests no other Google account access.",
      },
      {
        question: "I signed in on a new phone but my data is missing.",
        answer:
          "Signing in does not by itself move data — Cloud Sync has to be enabled. Turn it on in Settings on the old device first, wait for the sync to finish, then sign in and enable it on the new one.",
      },
    ],
  },
  {
    id: "health-connect",
    label: "Health Connect",
    items: [
      {
        question: "Why is Health Connect showing no data?",
        answer:
          "Check three things: Health Connect itself is installed and set up, IGNYT has been granted the specific data types in Health Connect → App permissions → IGNYT, and another app is actually writing that data. Health Connect has nothing to give if no app has recorded it.",
      },
      {
        question: "Can I allow steps but not heart rate?",
        answer:
          "Yes. Every data type is a separate permission. IGNYT handles partial grants — denying one metric never blocks the ones you allowed.",
      },
      {
        question: "Does my health data go to your servers?",
        answer:
          "No. The exchange happens on-device through Android. IGNYT operates no server that receives Health Connect data, and it is never used for advertising or sold.",
      },
    ],
  },
  {
    id: "food-database",
    label: "Food database",
    items: [
      {
        question:
          "How many foods are included, and does search need a connection?",
        answer:
          "3,160 curated foods ship inside the app, and search runs entirely on the device — it works in aeroplane mode.",
      },
      {
        question: "A food is missing or the values look wrong.",
        answer:
          "Create a custom food with the values from the label — it will be saved for reuse. If a bundled entry looks incorrect, email us the food name and the correct figures and we will fix it in the next release.",
      },
      {
        question: "Does barcode scanning work offline?",
        answer:
          "Scanning matches against the on-device database, so recognised products resolve offline. Products that are not in the database can be added as a custom food.",
      },
    ],
  },
  {
    id: "workouts",
    label: "Workouts",
    items: [
      {
        question: "Does the rest timer keep running if I lock the phone?",
        answer:
          "Yes. The timer is scheduled locally and continues while the app is in the background, notifying you when the rest period ends.",
      },
      {
        question: "How are personal records detected?",
        answer:
          "IGNYT compares each completed set against your history for that exercise and flags a record the moment you beat it — by load, by reps at load, or by estimated one-rep-max.",
      },
      {
        question: "Can I build my own routines?",
        answer:
          "Yes. Build routines from the exercise library, reorder them, set target sets and reps, and reuse them across a training block.",
      },
    ],
  },
  {
    id: "subscriptions",
    label: "Subscriptions and pricing",
    items: [
      {
        question: "Is IGNYT free?",
        answer:
          "Yes. IGNYT is free on Google Play with no subscription, no premium tier and no in-app purchases. Nothing you have logged is ever locked behind a payment.",
      },
      {
        question: "Are there ads?",
        answer:
          "No. There are no advertisements and no advertising SDKs in the app.",
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    items: [
      {
        question: "Where is my data stored?",
        answer:
          "On your device by default, in app-sandboxed storage. It is uploaded only if you sign in and switch on Cloud Sync or Drive backup — both off until you enable them.",
      },
      {
        question: "How do I delete everything?",
        answer:
          "Settings → Danger Zone → Reset All App Data erases local data immediately. For your account and cloud backup, use Settings → Account → Delete Account, or email us from your account address. The Data Deletion Policy sets out the timelines.",
      },
      {
        question: "Can I get my data out?",
        answer:
          "Yes, at any time. Settings → Export Data produces a full JSON backup or CSV files per data type.",
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    items: [
      {
        question: "My reminders are not firing.",
        answer:
          "Android battery optimisation is the usual cause. Allow notifications for IGNYT in Android Settings, then exclude IGNYT from battery optimisation so background schedules are not deferred.",
      },
      {
        question: "Do notifications send anything to a server?",
        answer:
          "No. Reminders are scheduled on the device and no notification content leaves the phone.",
      },
    ],
  },
  {
    id: "diet-plans",
    label: "Diet plans",
    items: [
      {
        question: "How is adherence calculated?",
        answer:
          "IGNYT compares what you actually logged against the meals and targets in your plan for that day, and scores the proportion that matched.",
      },
      {
        question: "Can I swap a single meal without rebuilding the day?",
        answer:
          "Yes. Meals are individually editable — swapping one leaves the rest of the plan and its targets untouched.",
      },
    ],
  },
  {
    id: "water-supplements-fasting",
    label: "Water, supplements and fasting",
    items: [
      {
        question: "Can I change the quick-add water amounts?",
        answer:
          "Yes. Quick-add sizes and your daily hydration goal are both configurable, as are the hours reminders are allowed to fire.",
      },
      {
        question: "How does supplement inventory work?",
        answer:
          "Record how much of a supplement you have and its daily dose; IGNYT counts down and warns you before you run out.",
      },
      {
        question: "Which fasting protocols are supported?",
        answer:
          "16:8 and custom windows, with a live countdown, the current stage of the fast and a history of every completed fast.",
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    items: [
      {
        question: "The app crashed or a screen is blank.",
        answer:
          "Force-stop and reopen it first. If it persists, export your data, then email us your device model, Android version and what you were doing at the time — that is usually enough to reproduce it.",
      },
      {
        question: "Sync seems stuck.",
        answer:
          "Confirm you are signed in and Cloud Sync is enabled, then trigger a manual sync from Settings. Sync needs a connection; it resumes automatically once you are back online.",
      },
      {
        question: "How do I move to a new phone?",
        answer:
          "Either enable Cloud Sync on both devices, or export a full JSON backup from the old phone and import it on the new one.",
      },
    ],
  },
];

/** Flattened list, used for the FAQPage structured data. */
export const allFaqs = faqGroups.flatMap((group) => group.items);
