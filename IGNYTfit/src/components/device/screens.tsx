import type { ReactNode } from "react";
import {
  AreaChart,
  Avatar,
  Bars,
  Chip,
  Meter,
  Ring,
  Row,
  ScreenBody,
  ScreenHeader,
  StatTile,
  StatusBar,
  TabBar,
  Tile,
} from "@/components/device/ui";
import type { ScreenId } from "@/lib/screens";

/**
 * Vector reproductions of every major IGNYT screen.
 *
 * One component per screen, all pure markup with no hooks, so they can be
 * rendered from server components *and* imported into the client-side
 * carousels without pulling in extra runtime.
 *
 * Sample values are representative, not real user data — they exist to show
 * the layout and information density of each screen.
 */

function Screen({
  children,
  tab,
}: {
  children: ReactNode;
  /** Highlighted bottom-tab, or `null` for full-screen views. */
  tab?: string | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#0b0d13_0%,#08090d_42%)]">
      <StatusBar />
      {children}
      {tab === null ? null : <TabBar active={tab ?? "home"} />}
    </div>
  );
}

/* ------------------------------------------------------------ dashboard */

function Dashboard() {
  return (
    <Screen tab="home">
      <ScreenHeader
        title="Good morning, Varun"
        subtitle="Tuesday · Push day"
        right={<Avatar tone="ember">V</Avatar>}
      />
      <ScreenBody tight>
        <Tile tone="ember" className="flex items-center gap-3">
          <Ring value={0.72} size={70} stroke={7}>
            <span className="text-[15px] font-extrabold text-text">1,842</span>
            <span className="mt-0.5 block text-[7.5px] text-text-dim">
              of 2,550 kcal
            </span>
          </Ring>
          <div className="flex-1 space-y-1.5">
            {[
              {
                label: "Protein",
                value: 0.82,
                color: "var(--color-ember)",
                text: "142 / 175 g",
              },
              {
                label: "Carbs",
                value: 0.64,
                color: "var(--color-pulse)",
                text: "168 / 262 g",
              },
              {
                label: "Fat",
                value: 0.55,
                color: "var(--color-warn)",
                text: "39 / 71 g",
              },
            ].map((macro) => (
              <div key={macro.label}>
                <div className="flex justify-between text-[8px] font-semibold">
                  <span className="text-text-mute">{macro.label}</span>
                  <span className="text-text-dim">{macro.text}</span>
                </div>
                <Meter
                  value={macro.value}
                  color={macro.color}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Tile>

        <div className="flex gap-2.5">
          <StatTile
            label="Steps"
            value="8,412"
            sub="Health Connect"
            accent="text-pulse-strong"
          />
          <StatTile
            label="Water"
            value="2.1"
            unit="L"
            sub="of 3.0 L"
            accent="text-cyan"
          />
          <StatTile
            label="Weight"
            value="74.6"
            unit="kg"
            sub="−0.4 this week"
            accent="text-good"
          />
        </div>

        <Tile>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-text">
              Today&apos;s workout
            </p>
            <Chip active>In progress</Chip>
          </div>
          <div className="space-y-1.5">
            <Row
              title="Bench Press"
              sub="4 × 8 · 72.5 kg"
              right="3/4"
              leading={<Avatar>B</Avatar>}
            />
            <Row
              title="Incline DB Press"
              sub="3 × 10 · 26 kg"
              right="0/3"
              leading={<Avatar tone="pulse">I</Avatar>}
            />
          </div>
        </Tile>

        <Tile>
          <p className="mb-2 text-[10px] font-bold text-text">This week</p>
          <Bars
            data={[420, 0, 610, 380, 700, 260, 540]}
            labels={["M", "T", "W", "T", "F", "S", "S"]}
            height={22}
          />
        </Tile>
      </ScreenBody>
    </Screen>
  );
}

/* -------------------------------------------------------------- workout */

function Workout() {
  return (
    <Screen tab="workout">
      <ScreenHeader
        title="Push · Session 12"
        subtitle="00:42:18 elapsed"
        right={<Chip active>Rest 90s</Chip>}
      />
      <ScreenBody>
        <Tile tone="ember" className="flex items-center justify-between">
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              Rest timer
            </p>
            <p className="text-[26px] font-extrabold leading-none text-ember">
              0:47
            </p>
          </div>
          <Ring value={0.52} size={54} stroke={6} color="var(--color-ember)">
            <span className="text-[9px] font-bold text-text">52%</span>
          </Ring>
        </Tile>

        <Tile>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10.5px] font-bold text-text">Bench Press</p>
            <span className="text-[8.5px] font-semibold text-good">
              PR 82.5 kg
            </span>
          </div>
          <div className="space-y-1">
            {[
              { set: 1, kg: "70", reps: "10", done: true },
              { set: 2, kg: "72.5", reps: "8", done: true },
              { set: 3, kg: "72.5", reps: "8", done: true },
              { set: 4, kg: "75", reps: "6", done: false },
            ].map((row) => (
              <div
                key={row.set}
                className="grid grid-cols-[22px_1fr_1fr_20px] items-center gap-2 rounded-[10px] border border-line-soft bg-surface-2 px-2 py-1.5"
              >
                <span className="text-[9px] font-bold text-text-dim">
                  {row.set}
                </span>
                <span className="text-[10px] font-bold text-text">
                  {row.kg} kg
                </span>
                <span className="text-[10px] font-bold text-text">
                  {row.reps} reps
                </span>
                <span
                  aria-hidden
                  className={
                    row.done
                      ? "grid size-4 place-items-center rounded-full bg-good/20 text-[8px] text-good"
                      : "grid size-4 place-items-center rounded-full border border-line text-[8px] text-text-dim"
                  }
                >
                  ✓
                </span>
              </div>
            ))}
          </div>
        </Tile>

        <div className="flex gap-2.5">
          <StatTile label="Volume" value="7,240" unit="kg" />
          <StatTile label="Sets" value="14" sub="of 18" accent="text-ember" />
        </div>

        <Row
          title="Incline DB Press"
          sub="Next · 3 × 10"
          leading={<Avatar tone="pulse">I</Avatar>}
        />
      </ScreenBody>
    </Screen>
  );
}

/* ------------------------------------------------------- exercise detail */

function ExerciseDetail() {
  return (
    <Screen tab={null}>
      <ScreenHeader
        title="Barbell Bench Press"
        subtitle="Chest · Compound"
        back
      />
      <ScreenBody withTabBar={false}>
        <div className="relative h-[110px] overflow-hidden rounded-[14px] border border-line-soft bg-[linear-gradient(150deg,#1b1f28,#0e1116)]">
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center text-[34px] opacity-70"
          >
            🏋️
          </span>
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[8px] font-bold text-text">
            Form guide
          </span>
        </div>

        <div className="flex gap-1.5 overflow-hidden">
          <Chip active>Chest</Chip>
          <Chip>Triceps</Chip>
          <Chip>Front delts</Chip>
        </div>

        <Tile>
          <p className="mb-1.5 text-[10px] font-bold text-text">Technique</p>
          <ol className="space-y-1 text-[8.5px] leading-relaxed text-text-mute">
            <li>1. Set shoulder blades down and back on the bench.</li>
            <li>2. Grip just outside shoulder width, wrists stacked.</li>
            <li>3. Lower to mid-chest with elbows at ~45°.</li>
            <li>4. Drive up and slightly back to lockout.</li>
          </ol>
        </Tile>

        <Tile>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-bold text-text">Estimated 1RM</p>
            <span className="text-[9px] font-bold text-good">
              +4.2 kg · 90d
            </span>
          </div>
          <AreaChart
            data={[78, 79, 81, 80.5, 83, 84, 86, 88]}
            gradientId="exercise-1rm"
            color="var(--color-ember)"
            height={56}
          />
        </Tile>

        <div className="flex gap-2.5">
          <StatTile label="Best set" value="82.5" unit="kg" />
          <StatTile label="Sessions" value="34" />
        </div>
      </ScreenBody>
    </Screen>
  );
}

/* ------------------------------------------------------------- food log */

function FoodLog() {
  return (
    <Screen tab="food">
      <ScreenHeader
        title="Food log"
        subtitle="Tuesday, 30 July"
        right={<Chip active>+ Add</Chip>}
      />
      <ScreenBody tight>
        <Tile tone="pulse" className="flex items-center gap-3">
          <Ring value={0.72} size={62} stroke={6} color="var(--color-pulse)">
            <span className="text-[13px] font-extrabold text-text">708</span>
            <span className="block text-[7px] text-text-dim">left</span>
          </Ring>
          <div className="flex-1">
            <p className="text-[9px] text-text-dim">Eaten · Burned · Goal</p>
            <p className="text-[12px] font-extrabold text-text">
              1,842 · 610 · 2,550
            </p>
            <Meter value={0.72} color="var(--color-pulse)" className="mt-2" />
          </div>
        </Tile>

        {[
          { meal: "Breakfast", kcal: "512", items: ["Oats & whey"] },
          {
            meal: "Lunch",
            kcal: "744",
            items: ["Chicken breast", "Basmati rice"],
          },
          { meal: "Snack", kcal: "286", items: ["Greek yoghurt"] },
        ].map((meal) => (
          <Tile key={meal.meal}>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold text-text">{meal.meal}</p>
              <p className="text-[10px] font-bold text-ember">
                {meal.kcal} kcal
              </p>
            </div>
            <div className="space-y-1">
              {meal.items.map((item) => (
                <Row
                  key={item}
                  title={item}
                  sub="100 g"
                  right="—"
                  leading={<Avatar tone="good">{item[0]}</Avatar>}
                />
              ))}
            </div>
          </Tile>
        ))}
      </ScreenBody>
    </Screen>
  );
}

/* ---------------------------------------------------------- food search */

function FoodSearch() {
  return (
    <Screen tab="food">
      <ScreenHeader title="Search foods" subtitle="3,160 foods offline" back />
      <ScreenBody>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-2">
          <span aria-hidden className="text-[10px] text-text-dim">
            🔍
          </span>
          <span className="text-[10px] font-medium text-text">paneer</span>
          <span className="ml-auto text-[8.5px] font-bold text-pulse-strong">
            Scan
          </span>
        </div>

        <div className="flex gap-1.5 overflow-hidden">
          <Chip active>All</Chip>
          <Chip>Recent</Chip>
          <Chip>Favourites</Chip>
          <Chip>My foods</Chip>
        </div>

        <div className="space-y-1.5">
          {[
            ["Paneer, full fat", "296 kcal · 100 g", "18.3 g"],
            ["Paneer, low fat", "204 kcal · 100 g", "22.1 g"],
            ["Paneer tikka, grilled", "268 kcal · 100 g", "20.4 g"],
            ["Palak paneer", "182 kcal · 100 g", "8.6 g"],
            ["Paneer bhurji", "224 kcal · 100 g", "13.2 g"],
            ["Shahi paneer", "312 kcal · 100 g", "9.8 g"],
          ].map(([name, meta, protein]) => (
            <Row
              key={name}
              title={name}
              sub={meta}
              right={protein}
              rightSub="protein"
              leading={<Avatar tone="good">P</Avatar>}
            />
          ))}
        </div>
      </ScreenBody>
    </Screen>
  );
}

/* ---------------------------------------------------- nutrition analysis */

function Nutrition() {
  return (
    <Screen tab="food">
      <ScreenHeader title="Nutrition" subtitle="Last 7 days average" />
      <ScreenBody>
        <div className="flex gap-2.5">
          <StatTile label="Avg kcal" value="2,318" accent="text-ember" />
          <StatTile
            label="Protein"
            value="1.9"
            unit="g/kg"
            accent="text-good"
          />
        </div>

        <Tile>
          <p className="mb-2 text-[10px] font-bold text-text">Macro split</p>
          <div className="flex items-center gap-3">
            <Ring value={0.34} size={58} stroke={9} color="var(--color-ember)">
              <span className="text-[9px] font-bold text-text">34%</span>
              <span className="block text-[6.5px] text-text-dim">protein</span>
            </Ring>
            <div className="flex-1 space-y-1.5">
              {[
                ["Protein", "34%", "var(--color-ember)"],
                ["Carbs", "43%", "var(--color-pulse)"],
                ["Fat", "23%", "var(--color-warn)"],
              ].map(([label, pct, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="flex-1 text-[9px] font-semibold text-text-mute">
                    {label}
                  </span>
                  <span className="text-[9px] font-bold text-text">{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </Tile>

        <Tile>
          <p className="mb-2 text-[10px] font-bold text-text">Micronutrients</p>
          <div className="space-y-2">
            {[
              ["Fibre", 0.68, "27 / 38 g"],
              ["Iron", 0.91, "16.4 / 18 mg"],
              ["Calcium", 0.54, "540 / 1000 mg"],
              ["Vitamin C", 1, "112 / 90 mg"],
              ["Sodium", 0.78, "1.8 / 2.3 g"],
            ].map(([label, value, text]) => (
              <div key={label as string}>
                <div className="flex justify-between text-[8.5px] font-semibold">
                  <span className="text-text-mute">{label}</span>
                  <span className="text-text-dim">{text}</span>
                </div>
                <Meter
                  value={value as number}
                  color={
                    (value as number) >= 1
                      ? "var(--color-good)"
                      : "var(--color-pulse)"
                  }
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Tile>
      </ScreenBody>
    </Screen>
  );
}

/* ------------------------------------------------------------ diet plan */

function DietPlan() {
  return (
    <Screen tab="food">
      <ScreenHeader title="Diet plan" subtitle="Lean bulk · 2,550 kcal" />
      <ScreenBody>
        <div className="flex gap-1.5 overflow-hidden">
          <Chip active>Day 4</Chip>
          <Chip>Day 5</Chip>
          <Chip>Day 6</Chip>
          <Chip>Day 7</Chip>
        </div>

        <Tile tone="ember">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-text-dim">
                Plan adherence
              </p>
              <p className="text-[20px] font-extrabold leading-none text-ember">
                86%
              </p>
            </div>
            <div className="text-right text-[8.5px] text-text-mute">
              <p>18 of 21 meals</p>
              <p className="text-good">on target</p>
            </div>
          </div>
        </Tile>

        {[
          [
            "Breakfast · 07:30",
            "Oats, whey, banana, peanut butter",
            "612 kcal",
          ],
          ["Lunch · 13:00", "Chicken, rice, mixed vegetables", "780 kcal"],
          ["Pre-workout · 17:00", "Greek yoghurt, honey, berries", "286 kcal"],
          ["Dinner · 20:30", "Paneer, roti, dal, salad", "704 kcal"],
        ].map(([title, sub, right]) => (
          <Row
            key={title}
            title={title}
            sub={sub}
            right={right}
            leading={<Avatar tone="warn">•</Avatar>}
          />
        ))}
      </ScreenBody>
    </Screen>
  );
}

/* -------------------------------------------------------------- fasting */

function Fasting() {
  return (
    <Screen tab="more">
      <ScreenHeader title="Fasting" subtitle="16:8 protocol" />
      <ScreenBody className="items-center">
        <div className="py-2">
          <Ring value={0.78} size={150} stroke={12} color="var(--color-pulse)">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              Fasting
            </span>
            <span className="mt-1 block text-[27px] font-extrabold leading-none text-text">
              12:28
            </span>
            <span className="mt-1 block text-[8.5px] text-text-dim">
              3h 32m to go
            </span>
          </Ring>
        </div>

        <div className="flex w-full gap-2.5">
          <StatTile label="Started" value="21:32" sub="Yesterday" />
          <StatTile
            label="Ends"
            value="13:32"
            sub="Today"
            accent="text-pulse-strong"
          />
        </div>

        <Tile className="w-full">
          <p className="mb-2 text-[10px] font-bold text-text">Last 7 fasts</p>
          <Bars
            data={[16, 15.5, 16, 14, 16.5, 16, 12.5]}
            labels={["M", "T", "W", "T", "F", "S", "S"]}
            color="var(--color-pulse)"
            height={40}
          />
        </Tile>

        <Row
          className="w-full"
          title="Stage · Fat burning"
          sub="Glycogen depleted, lipolysis rising"
          leading={<Avatar tone="pulse">🔥</Avatar>}
        />
      </ScreenBody>
    </Screen>
  );
}

/* ---------------------------------------------------------------- water */

function Water() {
  return (
    <Screen tab="more">
      <ScreenHeader title="Hydration" subtitle="Goal 3.0 L" />
      <ScreenBody className="items-center">
        <div className="relative my-1 h-[150px] w-[104px] overflow-hidden rounded-[26px] border border-cyan/30 bg-surface">
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(180deg,rgba(85,216,255,0.55),rgba(50,184,244,0.25))]"
          />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[24px] font-extrabold leading-none text-text">
                2.1
              </p>
              <p className="text-[9px] font-semibold text-text-mute">
                of 3.0 L
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full gap-2">
          {["+250", "+500", "+750"].map((amount) => (
            <div
              key={amount}
              className="flex-1 rounded-[12px] border border-cyan/30 bg-cyan/8 py-2 text-center text-[10px] font-bold text-cyan"
            >
              {amount} ml
            </div>
          ))}
        </div>

        <Tile className="w-full">
          <p className="mb-2 text-[10px] font-bold text-text">This week</p>
          <Bars
            data={[2.4, 3.1, 2.8, 3.0, 2.2, 3.2, 2.1]}
            labels={["M", "T", "W", "T", "F", "S", "S"]}
            color="var(--color-cyan)"
            height={40}
          />
        </Tile>

        <Row
          className="w-full"
          title="Reminder every 90 min"
          sub="08:00 – 21:00"
          right="On"
          leading={<Avatar tone="pulse">⏰</Avatar>}
        />
      </ScreenBody>
    </Screen>
  );
}

/* ---------------------------------------------------------- supplements */

function Supplements() {
  return (
    <Screen tab="more">
      <ScreenHeader title="Supplements" subtitle="Daily stack · 6 items" />
      <ScreenBody tight>
        <div className="flex gap-2.5">
          <StatTile label="Taken today" value="4/6" accent="text-good" />
          <StatTile label="Adherence" value="93" unit="%" sub="30 days" />
        </div>

        {[
          ["Creatine monohydrate", "5 g · morning", true],
          ["Whey isolate", "30 g · post-workout", true],
          ["Vitamin D3", "2000 IU · with food", true],
          ["Omega-3", "1000 mg · with food", true],
          ["Magnesium glycinate", "400 mg · night", false],
          ["Zinc", "15 mg · night", false],
        ].map(([name, dose, taken]) => (
          <Row
            key={name as string}
            title={name as string}
            sub={dose as string}
            right={taken ? "✓" : "—"}
            leading={<Avatar tone={taken ? "good" : "warn"}>💊</Avatar>}
          />
        ))}

        <Tile>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-text">Creatine stock</p>
            <p className="text-[9px] font-bold text-warn">11 days left</p>
          </div>
          <Meter value={0.28} color="var(--color-warn)" className="mt-2" />
        </Tile>
      </ScreenBody>
    </Screen>
  );
}

/* ------------------------------------------------------- health connect */

function HealthConnect() {
  return (
    <Screen tab="more">
      <ScreenHeader
        title="Health Connect"
        subtitle="Connected · 17 data types"
        right={<Chip active>Sync</Chip>}
      />
      <ScreenBody>
        <Tile tone="pulse" className="flex items-center gap-3">
          <Avatar tone="pulse">♥</Avatar>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-text">
              Reading from Health Connect
            </p>
            <p className="text-[8.5px] text-text-dim">
              Last sync 4 minutes ago · on-device only
            </p>
          </div>
        </Tile>

        <div className="flex gap-2.5">
          <StatTile label="Steps" value="8,412" accent="text-pulse-strong" />
          <StatTile
            label="Resting HR"
            value="54"
            unit="bpm"
            accent="text-bad"
          />
        </div>
        <div className="flex gap-2.5">
          <StatTile label="Sleep" value="7h 12" sub="82% quality" />
          <StatTile label="Active kcal" value="610" accent="text-ember" />
        </div>

        <Tile>
          <p className="mb-2 text-[10px] font-bold text-text">Permissions</p>
          <div className="space-y-1">
            {[
              ["Steps · Distance · Exercise", true],
              ["Heart rate · SpO₂ · Respiratory", true],
              ["Sleep sessions", true],
              ["Weight · Body fat · Lean mass", true],
              ["Hydration · Nutrition", true],
              ["Blood pressure · Temperature", false],
            ].map(([label, granted]) => (
              <div
                key={label as string}
                className="flex items-center justify-between rounded-[10px] border border-line-soft bg-surface px-2.5 py-1.5"
              >
                <span className="text-[9px] font-semibold text-text-mute">
                  {label}
                </span>
                <span
                  className={
                    granted
                      ? "text-[8.5px] font-bold text-good"
                      : "text-[8.5px] font-bold text-text-dim"
                  }
                >
                  {granted ? "Allowed" : "Not set"}
                </span>
              </div>
            ))}
          </div>
        </Tile>
      </ScreenBody>
    </Screen>
  );
}

/* --------------------------------------------------------------- weight */

function Weight() {
  return (
    <Screen tab="progress">
      <ScreenHeader
        title="Weight"
        subtitle="90-day trend"
        right={<Chip active>+ Log</Chip>}
      />
      <ScreenBody tight>
        <Tile>
          <div className="mb-1 flex items-end justify-between">
            <div>
              <p className="text-[26px] font-extrabold leading-none text-text">
                74.6
                <span className="ml-1 text-[11px] font-bold text-text-dim">
                  kg
                </span>
              </p>
              <p className="mt-1 text-[8.5px] font-semibold text-good">
                −2.8 kg since April
              </p>
            </div>
            <Chip active>Goal 72.0</Chip>
          </div>
          <AreaChart
            data={[77.4, 77.1, 76.6, 76.8, 76.1, 75.6, 75.4, 74.9, 74.6]}
            gradientId="weight-trend"
            color="var(--color-good)"
            height={72}
          />
        </Tile>

        <div className="flex gap-2.5">
          <StatTile label="Body fat" value="14.2" unit="%" />
          <StatTile
            label="Lean mass"
            value="64.0"
            unit="kg"
            accent="text-good"
          />
        </div>

        <Tile>
          <p className="mb-2 text-[10px] font-bold text-text">Measurements</p>
          <div className="space-y-1">
            {[
              ["Chest", "104.5 cm", "+1.2"],
              ["Waist", "81.0 cm", "−2.4"],
              ["Arms", "38.4 cm", "+0.8"],
              ["Thighs", "59.2 cm", "+0.6"],
            ].map(([part, value, delta]) => (
              <Row key={part} title={part} right={value} rightSub={delta} />
            ))}
          </div>
        </Tile>
      </ScreenBody>
    </Screen>
  );
}

/* ------------------------------------------------------------- progress */

function Progress() {
  return (
    <Screen tab="progress">
      <ScreenHeader title="Progress" subtitle="Last 12 weeks" />
      <ScreenBody>
        <div className="flex gap-1.5 overflow-hidden">
          <Chip active>Volume</Chip>
          <Chip>Strength</Chip>
          <Chip>Body</Chip>
          <Chip>Nutrition</Chip>
        </div>

        <Tile>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-text">Weekly volume</p>
            <span className="text-[9px] font-bold text-good">+18%</span>
          </div>
          <Bars
            data={[38, 42, 41, 47, 44, 52, 49, 56, 54, 61, 58, 66]}
            color="var(--color-ember)"
            height={60}
          />
        </Tile>

        <div className="flex gap-2.5">
          <StatTile label="Workouts" value="47" sub="12 weeks" />
          <StatTile label="Streak" value="16" unit="d" accent="text-ember" />
          <StatTile label="PRs" value="9" accent="text-good" />
        </div>

        <Tile>
          <p className="mb-2 text-[10px] font-bold text-text">
            Personal records
          </p>
          <div className="space-y-1">
            {[
              ["Bench Press", "82.5 kg", "+5.0"],
              ["Back Squat", "132.5 kg", "+7.5"],
              ["Deadlift", "165.0 kg", "+10.0"],
            ].map(([lift, value, delta]) => (
              <Row
                key={lift}
                title={lift}
                right={value}
                rightSub={delta}
                leading={<Avatar tone="good">★</Avatar>}
              />
            ))}
          </div>
        </Tile>
      </ScreenBody>
    </Screen>
  );
}

/* -------------------------------------------------------- notifications */

function Notifications() {
  return (
    <Screen tab="more">
      <ScreenHeader title="Reminders" subtitle="6 active schedules" />
      <ScreenBody>
        {[
          ["Water", "Every 90 min · 08:00–21:00", true, "pulse"],
          ["Workout", "Mon, Wed, Fri · 18:00", true, "ember"],
          ["Log dinner", "Daily · 20:45", true, "warn"],
          ["Supplements", "Daily · 07:30 & 22:00", true, "good"],
          ["Weigh-in", "Sundays · 08:00", false, "pulse"],
          ["Fasting window", "Ends 13:32", true, "ember"],
        ].map(([title, sub, on, tone]) => (
          <div
            key={title as string}
            className="flex items-center gap-2.5 rounded-[12px] border border-line-soft bg-surface px-2.5 py-2"
          >
            <Avatar tone={tone as "ember" | "pulse" | "good" | "warn"}>
              🔔
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10.5px] font-bold text-text">
                {title}
              </p>
              <p className="truncate text-[8.5px] text-text-dim">{sub}</p>
            </div>
            <span
              aria-hidden
              className={
                on
                  ? "flex h-[15px] w-[26px] items-center justify-end rounded-full bg-ember px-[2px]"
                  : "flex h-[15px] w-[26px] items-center rounded-full bg-surface-3 px-[2px]"
              }
            >
              <span className="size-[11px] rounded-full bg-white" />
            </span>
          </div>
        ))}

        <Tile tone="pulse">
          <p className="text-[9.5px] leading-relaxed text-text-mute">
            Reminders are scheduled on your device. Nothing is sent to a server
            and no notification content leaves the phone.
          </p>
        </Tile>
      </ScreenBody>
    </Screen>
  );
}

/* -------------------------------------------------------------- profile */

function Profile() {
  return (
    <Screen tab="more">
      <ScreenHeader title="Profile" />
      <ScreenBody>
        <Tile tone="ember" className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-full bg-ember/20 text-[15px] font-extrabold text-ember"
          >
            V
          </span>
          <div>
            <p className="text-[12px] font-extrabold text-text">Varun S</p>
            <p className="text-[8.5px] text-text-dim">
              Member since Jan 2026 · Lean bulk
            </p>
          </div>
        </Tile>

        <div className="flex gap-2.5">
          <StatTile label="Age" value="24" />
          <StatTile label="Height" value="178" unit="cm" />
          <StatTile label="Weight" value="74.6" unit="kg" />
        </div>

        <Tile>
          <p className="mb-2 text-[10px] font-bold text-text">Targets</p>
          <div className="space-y-1">
            {[
              ["Daily calories", "2,550 kcal"],
              ["Protein", "175 g"],
              ["Water", "3.0 L"],
              ["Steps", "10,000"],
              ["Workouts / week", "5"],
            ].map(([label, value]) => (
              <Row key={label} title={label} right={value} />
            ))}
          </div>
        </Tile>

        <Row
          title="Achievements"
          sub="12 unlocked · 3 in progress"
          right="›"
          leading={<Avatar tone="good">🏆</Avatar>}
        />
      </ScreenBody>
    </Screen>
  );
}

/* ------------------------------------------------------------- settings */

function Settings() {
  return (
    <Screen tab="more">
      <ScreenHeader title="Settings" />
      <ScreenBody tight>
        {[
          {
            group: "Account",
            rows: [
              ["Google account", "Signed in"],
              ["Cloud sync", "On"],
            ],
          },
          {
            group: "Integrations",
            rows: [
              ["Health Connect", "Connected"],
              ["Drive backup", "Weekly"],
            ],
          },
          {
            group: "Data",
            rows: [
              ["Export data", "JSON · CSV"],
              ["Import data", "From backup"],
              ["Reset all data", "Danger zone"],
            ],
          },
          {
            group: "App",
            rows: [
              ["Theme", "Dark"],
              ["Units", "Metric"],
              ["Offline mode", "Always on"],
            ],
          },
        ].map((section) => (
          <div key={section.group}>
            <p className="mb-1 px-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-text-dim">
              {section.group}
            </p>
            <div className="space-y-1">
              {section.rows.map(([label, value]) => (
                <Row
                  key={label}
                  title={label}
                  right={value}
                  className={
                    label === "Reset all data"
                      ? "border-bad/30 bg-bad/6"
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}

        <p className="pt-1 text-center text-[8px] text-text-dim">
          IGNYT 1.0.30 · com.varun.ignyt
        </p>
      </ScreenBody>
    </Screen>
  );
}

/* -------------------------------------------------------------- registry */

/**
 * Screen id → component. Consumers look screens up here rather than importing
 * individual components, so a new screen is added in exactly two places:
 * `lib/screens.ts` (copy) and this map (visuals).
 */
export const SCREEN_COMPONENTS: Record<ScreenId, () => ReactNode> = {
  dashboard: Dashboard,
  workout: Workout,
  exercise: ExerciseDetail,
  "food-log": FoodLog,
  "food-search": FoodSearch,
  nutrition: Nutrition,
  "diet-plan": DietPlan,
  fasting: Fasting,
  water: Water,
  supplements: Supplements,
  "health-connect": HealthConnect,
  weight: Weight,
  progress: Progress,
  notifications: Notifications,
  profile: Profile,
  settings: Settings,
};

/** Renders the screen registered under `id`. */
export function AppScreen({ id }: { id: ScreenId }) {
  const Component = SCREEN_COMPONENTS[id];
  return <Component />;
}
