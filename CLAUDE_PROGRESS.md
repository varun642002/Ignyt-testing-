# IGNYT — progress and the next task

Branch: `feature/premium-subscription`  ·  HEAD at time of writing: `97f3c1b`  ·  Suite: 45/48

The three failing tests are the **empty knowledge base** (`www/data/knowledge.json` is `[]`, emptied
on request). They assert that the base answers a known question, that a bench-press question
returns anatomy, and that changing the subject mid-follow-up gets a real answer. All three pass
once data is loaded. They are not weakened to go green.

---

## THE NEXT TASK: rebuild the routing decision

### Why

`runClassified()` in `www/js/ai/local-chat.js` executes a handler's `run()` **without consulting
that handler's own `test()`**. Two live consequences:

- `"macros of dal"` answers with the user's calorie target instead of dal's nutrition, because
  `GET_CALORIE_TARGET` is a promoted intent and claims the word *macros* before the nutrition
  handler is consulted.
- The protein-target handler was reached by past-tense questions its own matcher excludes.

**Do not "fix" this by making `runClassified` respect `test()`.** That was tried (2026-08-11) and
it broke `"get rid of everything I ate today"`, which reaches the delete handler *precisely
because* the classifier rescues phrasings the regex misses. That bypass is the point of the
classifier route, not an oversight. The conflict is structural and needs the redesign below.

### The shape to build

One declarative entry per intent, in one file, replacing the current split across three:

```
{
  intent:   "LOG_FOOD",
  examples: [...],              // today in intents.js
  match:    function (t) {},    // today in local-chat.js INTENTS[].test
  needs:    "addFoodLog",       // today in local-chat.js INTENTS[].needs
  run:      async function (A, t) {},
  scope:    "records" | "knowledge" | "compute",   // decides who outranks whom
  strict:   true | false        // does match() also gate the classifier route?
}
```

`strict` is the crux. `DELETE_TODAY_FOOD` wants `strict: false` so the classifier can rescue
unusual phrasings. `GET_CALORIE_TARGET` wants `strict: true` so its "not a past-tense question,
not a food lookup" guard applies on **both** routes. Today that choice cannot be expressed, which
is why fixing one case breaks the other.

The router becomes a thin loop over the table. Same behaviour, one place to read, and impossible
to guard half of — which is the failure that recurred four times on 2026-08-11 (a rule added to
the pattern loop but not `runClassified`, or the reverse).

### How to verify it

The tooling exists in the scratchpad and must be used, not replaced:

- `run-suite.js` — runs the 48-test harness against the real modules. `node run-suite.js`.
- `FOOD=1 node run-suite.js` — ad-hoc probes; edit the `process.env.FOOD` block.
- `TRACE_IN_SUITE="phrase" node run-suite.js` — prints the ladder trace for a message **inside**
  a suite run. Built because tracing a message in isolation gives different state and produced
  three wrong diagnoses.

**Assert on stored rows, not on which action was chosen.** Those two disagreed twice on
2026-08-11, including a delete that removed the wrong record and survived its own first fix.

Boundary phrases that must not regress:

```
how much protein should i eat     -> the target        how much protein did i eat today -> the log
how many calories should i eat    -> the target        how many calories did i eat today -> the log
macros of dal                     -> nutrition lookup  (BROKEN TODAY - the reason for this task)
delete it                         -> asks which record
delete yesterdays food            -> yesterday only, today survives
get rid of everything i ate today -> the delete handler (classifier rescue - must keep working)
log 200g chicken / i ate 2 eggs   -> writes
chicken and chapati               -> two foods, one serving each
```

---

## State of the system

**Food (complete, verified against stored data).** Logging in 15 phrasings, dates, meals,
multi-item with and without quantities, plurals, bare lists, guided flow, running daily totals,
deletion by day / meal / name / all / newest, and `"delete it"` asking which.

**Library:** 11,149 foods. Every import applies an audit — impossible magnitudes, macros over
105 g per 100 g, calories disagreeing with their own macros — and rejects rather than importing
bad rows. Rejected rows are listed in the scratchpad with reasons.

*The audit cannot catch a mislabelled row.* The old `Chicken` entry read 131 kcal / 8.2 g protein
and was internally consistent; it was a curry filed under the plain name. Fixed, along with
`Fish`. A second check exists for plain-named staples whose protein density is implausible.

**Every import adds variants and never the base.** `Rice`, `Dal`, `Biryani` all had to be added by
hand after imports buried them. Check the plain name after every import.

**Intents:** 15, 3,051 examples, generated from templates with a cross-intent collision check.

**AI (hybrid, working on device).** Local first, model last. `www/js/ai/ai-intent.js` validates
the model's `{intent, args}` against a 17-entry allow-list before anything executes: unknown
intents, wrong types, out-of-range values and markup are all refused, and a field that fails its
check fails the whole reply. Risk tier comes from the action registry, so destructive intents
still confirm. Fails silently to local on timeout, malformed reply or no backend.

`AI_FIRST` in `service.js` puts the model ahead of local. It was tried and reverted: every message
then waits up to six seconds for a backend that sleeps every fifteen minutes.

**Backend:** `https://ignyt-backend-oo80.onrender.com`, healthy, auth enforced. `ChatRequest`
accepts `message, context, history, toolResults, timezone` — **there is no `system` field**;
sending one silently loses the instruction. Free tier sleeps; first request after idle takes ~45 s.

---

## Open items

- **`createWorkout` is `destroy` tier**, so creating a routine asks for confirmation. Likely wrong
  — creation is reversible — but it is a product call and has not been made.
- **`"calories in 65 chicken"`** returns nothing: food-name patterns require a letter first and
  several dozen imported dishes begin with a digit.
- **Knowledge base is empty**, awaiting data.
- **Voice**: the repeated-transcript fix in `voice.js` is a guard (`collapseRepeats`) that removes
  the damage without the cause being fully understood. Two earlier fixes to how the transcript is
  built did not hold. Confirmed working on device once.

## A recurring failure worth knowing about

**Eight times on 2026-08-11**, a regex escape was written into a file as a literal control
character — `\b` became `0x08`, `\s` became `s`, `\n` became a real newline. `node --check` passes
most of them. Two produced a *plausible wrong answer* rather than an obvious failure; one disabled
a safety guard silently.

Sweep the **built bundle**, not the source, after any edit containing a backslash:

```bash
python -c "import io,re,glob;print({f:len(re.findall(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',io.open(f,encoding='utf-8').read())) for f in glob.glob('android/app/src/main/assets/public/js/**/*.js',recursive=True) if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',io.open(f,encoding='utf-8').read())})"
```

`js/food/food-search.js` contains one `\x01` deliberately, as a cache-key delimiter. Everything
else should be clean.
