// scripts/quiz.js
// Vanilla JS + Alpine.js 3  (single Alpine instance)

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
  snowy:   ["none", "emerald", "cartographer", "iron"],
  taiga:   ["none", "emerald", "cartographer", "iron", "flint"],
};

const CRAFT_OPTS = [false, true];
const DELAY_CORRECT = 600;
const DELAY_WRONG = 1500;

// Fisher–Yates shuffle
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------- Alpine store -------------
import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js";

Alpine.store("quiz", {
  // core state
  biome: "plains",
  get biomeName() { return this.biome[0].toUpperCase() + this.biome.slice(1); },

  houses: [],
  idx: 0,
  picks: { beds: null, chest: null, craft: null },

  // tracking & results
  attempts: 0,
  correct: 0,
  finished: false,
  get percent() { return this.attempts ? Math.round((this.correct / this.attempts) * 100) : 0; },
  get grade() {
    const p = this.percent;
    if (p >= 90) return "Spoingus pace";
    return "???";
  },

  get house() { return this.houses[this.idx] || {}; },
  get needCraft() { return this.biome === "desert"; },

  get chestOptions() {
    return CHEST_OPTS_BY_BIOME[this.biome] || ["none", "emerald", "bucket", "iron"];
  },

  get ready() {
    return this.picks.beds !== null &&
           this.picks.chest !== null &&
           (!this.needCraft || this.picks.craft !== null);
  },

  // ----------- methods -----------
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
    if (!this.house._showAnswer)
      return this.picks[kind] === value ? "ring-2 ring-yellow-400" : "";

    const correct = this.house[kind] === value;
    const wasPicked = this.picks[kind] === value;

    if (correct) return "ring-2 ring-green-500 animate-pulse";
    if (wasPicked) return "ring-2 ring-red-500 opacity-50 animate-pulse";
    return "opacity-40";
  },

  resetPicks() {
    this.picks = { beds: null, chest: null, craft: null };
    if (this.house) delete this.house._showAnswer;
  },

  // ----------- mount helpers -----------
  async mount(cardEl) {
    await this.loadBiome(this.biome);

    cardEl.innerHTML = `
      <!-- Quiz card (question mode) -->
      <div x-show="!$store.quiz.finished"
           class="p-5 border border-gray-700 rounded-2xl bg-gray-800"
           x-transition>
        <img :src="$store.quiz.house.image" :alt="$store.quiz.house.name"
             class="w-full max-h-56 object-contain mb-4 rounded" />

        <!-- Beds row -->
        <div class="mb-3">
          <p class="mb-1 font-semibold">Beds</p>
          <div class="grid grid-cols-4 gap-2">
            ${BED_OPTS.map(v => `
              <button @click="$store.quiz.select('beds', ${v})"
                      :class="$store.quiz.optionClass('beds', ${v})"
                      class="rounded border border-gray-600 p-1">
                <img src="${ICONS.beds(v)}" alt="${v} beds"
                     class="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              </button>`).join("")}
          </div>
        </div>

        <!-- Chest row -->
        <div class="mb-3">
          <p class="mb-1 font-semibold">Chest</p>
          <div class="grid gap-2"
               :class="$store.quiz.chestOptions.length === 5 ? 'grid-cols-5' : 'grid-cols-4'">
            <template x-for="t in $store.quiz.chestOptions" :key="t">
              <button @click="$store.quiz.select('chest', t)"
                      :class="$store.quiz.optionClass('chest', t)"
                      class="rounded border border-gray-600 p-1">
                <img :src="'assets/icons/chest_' + t + '.png'"
                     :alt="t + ' chest'"
                     class="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              </button>
            </template>
          </div>
        </div>

        <!-- Craft row (desert only) -->
        <template x-if="$store.quiz.needCraft">
          <div class="mb-3">
            <p class="mb-1 font-semibold">Crafting Table</p>
            <div class="grid grid-cols-2 gap-2">
              ${CRAFT_OPTS.map(flag => `
                <button @click="$store.quiz.select('craft', ${flag})"
                        :class="$store.quiz.optionClass('craft', ${flag})"
                        class="rounded border border-gray-600 p-1">
                  <img src="${ICONS.craft(flag)}"
                       alt="${flag ? 'Yes' : 'No'}"
                       class="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                </button>`).join("")}
            </div>
          </div>
        </template>

        <button @click="$store.quiz.submit()"
                :disabled="!$store.quiz.ready"
                class="mt-2 w-full py-2 rounded font-semibold
                       bg-emerald-600 disabled:bg-gray-700">
          Submit
        </button>

        <p class="mt-2 text-sm text-center">
          Score:
          <span x-text="$store.quiz.correct"></span> /
          <span x-text="$store.quiz.attempts"></span>
        </p>
      </div>

      <!-- Results card -->
      <div x-show="$store.quiz.finished"
          class="p-6 border border-gray-700 rounded-2xl bg-gray-800 text-center"
          x-transition>
        <h2 class="text-2xl font-bold mb-4">Results</h2>

        <p class="mb-2">You scored
          <span class="font-semibold" x-text="$store.quiz.percent"></span>%  
          (<span x-text="$store.quiz.correct"></span> /
          <span x-text="$store.quiz.attempts"></span>)
        </p>

        <p class="text-xl font-bold mb-6" x-text="$store.quiz.grade"></p>

        <p class="text-2xl font-bold mb-2">YOU:</p>
        <img :src="$store.quiz.percent >= 90
                    ? 'assets/grade/pace.png'
                    : 'assets/grade/huh.png'"
            alt="result image"
            class="mx-auto w-36 h-36 object-contain mb-6" />

        <button @click="$store.quiz.playAgain()"
                class="w-full py-2 rounded bg-emerald-600 font-semibold">
          Play again
        </button>
      </div>
    `;
    Alpine.initTree(cardEl);
  },

  initBiomeSwitcher(el) {
    el.innerHTML = BIOMES.map(b => `
      <button @click="$store.quiz.loadBiome('${b}')"
              :class="{'bg-emerald-600': $store.quiz.biome === '${b}'}"
              class="px-3 py-1 mx-1 rounded bg-gray-700 hover:bg-gray-600 capitalize">
        ${b}
      </button>`).join("");
    Alpine.initTree(el);
  },
});

Alpine.start();
