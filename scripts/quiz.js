// scripts/quiz.js
// Vanilla JS + Alpine.js 3

// ------------ constants ------------
const BIOMES = ["plains", "desert", "savanna", "taiga", "snowy"];

const ICONS = {
  beds:  n    => `assets/icons/beds_${n}.png`,
  chest: type => `assets/icons/chest_${type}.png`,
  craft: flag => `assets/icons/craft_${flag ? "yes" : "no"}.png`,
};

const BED_OPTS = [0, 1, 2, 4];

const CHEST_OPTS_BY_BIOME = {
  plains:  ["none", "emerald", "bucket", "iron", "cartographer"],
  desert:  ["none", "emerald", "iron"],
  savanna: ["none", "emerald", "bucket", "iron", "cartographer"],
  snowy:   ["none", "emerald", "iron", "cartographer"],
  taiga:   ["none", "emerald", "flint", "iron", "cartographer"],
};

const CRAFT_OPTS = [false, true];

const DELAY_CORRECT = 600;
const DELAY_WRONG = 1500;

// Fisher–Yates shuffle
function shuffle(a) {
  const copy = [...a];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js";

Alpine.store("quiz", {
  biome: "plains",
  houses: [],
  idx: 0,
  picks: { beds: null, chest: null, craft: null },

  attempts: 0,
  correct: 0,
  finished: false,

  get biomeName() {
    return this.biome[0].toUpperCase() + this.biome.slice(1);
  },

  get house() {
    return this.houses[this.idx] || {};
  },

  get needCraft() {
    return ["desert", "savanna", "taiga"].includes(this.biome);
  },

  get chestOptions() {
    return CHEST_OPTS_BY_BIOME[this.biome] || CHEST_OPTS_BY_BIOME.plains;
  },

  get percent() {
    return this.attempts ? Math.round((this.correct / this.attempts) * 100) : 0;
  },

  get grade() {
    return this.percent >= 90 ? "Spoingus pace" : "???";
  },

  get ready() {
    return this.picks.beds !== null &&
           this.picks.chest !== null &&
           (!this.needCraft || this.picks.craft !== null);
  },

  gridColsClass(count) {
    return {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
    }[count] || "grid-cols-4";
  },

  async loadBiome(b) {
    if (!BIOMES.includes(b)) return;

    this.biome = b;
    this.houses = shuffle(await (await fetch(`data/${b}.json`)).json());
    this.idx = 0;
    this.correct = 0;
    this.attempts = 0;
    this.finished = false;
    this.resetPicks();
  },

  playAgain() {
    this.loadBiome(this.biome);
  },

  select(kind, value) {
    this.picks[kind] = value;
  },

  submit() {
    if (this.finished || !this.house) return;
    if (this.house._showAnswer) return;

    const { beds, chest, craft = null } = this.house;

    const allCorrect =
      this.picks.beds === beds &&
      this.picks.chest === chest &&
      (!this.needCraft || this.picks.craft === craft);

    this.attempts++;
    if (allCorrect) this.correct++;

    this.house._showAnswer = true;

    const delay = allCorrect ? DELAY_CORRECT : DELAY_WRONG;

    setTimeout(() => {
      this.idx++;

      if (this.idx >= this.houses.length) {
        this.finished = true;
        return;
      }

      this.resetPicks();
    }, delay);
  },

  optionClass(kind, value) {
    if (!this.house._showAnswer) {
      return this.picks[kind] === value
        ? "border-yellow-400 ring-2 ring-yellow-400"
        : "border-gray-600 hover:border-gray-500";
    }

    const correct = this.house[kind] === value;
    const wasPicked = this.picks[kind] === value;

    if (correct) return "border-green-500 ring-2 ring-green-500 animate-pulse";
    if (wasPicked) return "border-red-500 ring-2 ring-red-500 opacity-50 animate-pulse";
    return "border-gray-700 opacity-40";
  },

  resetPicks() {
    this.picks = { beds: null, chest: null, craft: null };
    if (this.house) delete this.house._showAnswer;
  },

  async mount(cardEl) {
    await this.loadBiome(this.biome);

    cardEl.innerHTML = `
      <div x-show="!$store.quiz.finished"
           class="rounded-3xl border border-gray-700/80 bg-gray-800/90 shadow-2xl p-5 sm:p-6"
           x-transition>
        <img :src="$store.quiz.house.image"
             :alt="$store.quiz.house.name"
             class="w-full max-h-64 object-contain mb-5 rounded-xl" />

        <div class="mb-4">
          <p class="mb-2 font-semibold">Beds</p>
          <div class="grid gap-2"
               :class="$store.quiz.gridColsClass(4)">
            ${BED_OPTS.map(v => `
              <button @click="$store.quiz.select('beds', ${v})"
                      :class="$store.quiz.optionClass('beds', ${v})"
                      class="w-full aspect-square rounded-lg border bg-gray-800/70 p-1.5 sm:p-2 flex items-center justify-center transition">
                <img src="${ICONS.beds(v)}"
                     alt="${v} beds"
                     class="max-w-full max-h-full object-contain" />
              </button>
            `).join("")}
          </div>
        </div>

        <div class="mb-4">
          <p class="mb-2 font-semibold">Chest</p>
          <div class="grid gap-2"
               :class="$store.quiz.gridColsClass($store.quiz.chestOptions.length)">
            <template x-for="t in $store.quiz.chestOptions" :key="t">
              <button @click="$store.quiz.select('chest', t)"
                      :class="$store.quiz.optionClass('chest', t)"
                      class="w-full aspect-square rounded-lg border bg-gray-800/70 p-1.5 sm:p-2 flex items-center justify-center transition">
                <img :src="'assets/icons/chest_' + t + '.png'"
                     :alt="t + ' chest'"
                     class="max-w-full max-h-full object-contain" />
              </button>
            </template>
          </div>
        </div>

        <template x-if="$store.quiz.needCraft">
          <div class="mb-4">
            <p class="mb-2 font-semibold">Crafting Table</p>
            <div class="grid grid-cols-2 gap-2">
              ${CRAFT_OPTS.map(flag => `
                <button @click="$store.quiz.select('craft', ${flag})"
                        :class="$store.quiz.optionClass('craft', ${flag})"
                        class="w-full h-24 sm:h-28 rounded-lg border bg-gray-800/70 p-2 flex items-center justify-center transition">
                  <img src="${ICONS.craft(flag)}"
                       alt="${flag ? "Yes" : "No"}"
                       class="max-w-full max-h-full object-contain scale-90" />
                </button>
              `).join("")}
            </div>
          </div>
        </template>

        <button @click="$store.quiz.submit()"
                :disabled="!$store.quiz.ready"
                class="mt-1 w-full rounded-xl py-3 font-semibold text-lg
                       bg-emerald-600 hover:bg-emerald-500
                       disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed
                       transition">
          Submit
        </button>

        <p class="mt-4 text-center text-sm text-gray-300">
          Score:
          <span x-text="$store.quiz.correct"></span> /
          <span x-text="$store.quiz.attempts"></span>
        </p>
      </div>

      <div x-show="$store.quiz.finished"
           class="rounded-3xl border border-gray-700/80 bg-gray-800/90 shadow-2xl p-6 sm:p-7 text-center"
           x-transition>
        <h2 class="text-2xl font-bold mb-4">Results</h2>

        <p class="mb-2 text-base sm:text-lg">
          You scored
          <span class="font-semibold" x-text="$store.quiz.percent"></span>%
          (<span x-text="$store.quiz.correct"></span> /
          <span x-text="$store.quiz.attempts"></span>)
        </p>

        <p class="text-xl font-bold mb-5" x-text="$store.quiz.grade"></p>

        <p class="text-2xl font-bold mb-2">YOU:</p>

        <img :src="$store.quiz.percent >= 90
                    ? 'assets/grade/pace.png'
                    : 'assets/grade/huh.png'"
             alt="result image"
             class="mx-auto w-36 h-36 object-contain mb-6" />

        <button @click="$store.quiz.playAgain()"
                class="w-full rounded-xl py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold text-lg transition">
          Play again
        </button>
      </div>
    `;

    Alpine.initTree(cardEl);
  },

  initBiomeSwitcher(el) {
    el.innerHTML = BIOMES.map(b => `
      <button @click="$store.quiz.loadBiome('${b}')"
              :class="$store.quiz.biome === '${b}'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-700 text-gray-100 hover:bg-gray-600'"
              class="px-4 py-2 rounded-xl font-medium capitalize transition whitespace-nowrap">
        ${b}
      </button>
    `).join("");

    Alpine.initTree(el);
  },
});

Alpine.start();
