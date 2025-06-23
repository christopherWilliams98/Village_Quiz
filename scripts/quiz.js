// scripts/quiz.js
// Vanilla JS with a pinch of Alpine for the reactive bits

// ----  global constants  ----------------------------------
const BIOMES = ["plains", "desert", "savanna", "taiga", "snowy"];
const ICONS = {
  beds: n => `assets/icons/beds_${n}.png`,          // 0 1 2 4
  chest: type => `assets/icons/chest_${type}.png`, // none | emerald | bucket | iron
  craft: flag => `assets/icons/craft_${flag ? "yes" : "no"}.png`,
};

// selectable answers to render (order == visual order)
const BED_OPTS   = [0, 1, 2, 4];
const CHEST_OPTS = ["none", "emerald", "bucket", "iron"];
const CRAFT_OPTS = [true, false];

// simple utility — Fisher–Yates shuffle, in‑place
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ----  Alpine global store  ----------------------------------

import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js";

Alpine.store("quiz", {
  /* reactive state */
  biome: "plains",
  houses: [],
  idx: 0,
  // per‑question user picks
  picks: { beds: null, chest: null, craft: null },
  // cumulative score
  correctBeds: 0,
  correctChest: 0,

  get biomeName() {
    return this.biome.charAt(0).toUpperCase() + this.biome.slice(1);
  },
  get house() {
    return this.houses[this.idx] || {};
  },
  get ready() {
    const needCraft = this.biome === "desert";
    return (
      this.picks.beds !== null &&
      this.picks.chest !== null &&
      (!needCraft || this.picks.craft !== null)
    );
  },
  get showCraft() {
    return this.biome === "desert";
  },

  /* public methods */
  async loadBiome(b) {
    if (!BIOMES.includes(b)) return;
    this.biome = b;
    // fetch JSON — e.g. data/plains.json
    const res = await fetch(`data/${b}.json`);
    this.houses = shuffle(await res.json());
    this.idx = 0;
    this.resetPicks();
  },
  select(kind, value) {
    this.picks[kind] = value;
  },
  submit() {
    const h = this.house;
    if (!h) return;
    // grading
    if (this.picks.beds === h.beds) this.correctBeds++;
    if (this.picks.chest === h.chest) this.correctChest++;
    // simple flash effect via CSS class toggle (handled in template)
    h._showAnswer = true;
    // wait ½ sec → next question
    setTimeout(() => {
      this.idx++;
      if (this.idx >= this.houses.length) {
        alert(`Done! Bed points: ${this.correctBeds}/${this.houses.length}\nChest points: ${this.correctChest}/${this.houses.length}`);
        this.idx = 0;
        this.correctBeds = this.correctChest = 0;
      }
      this.resetPicks();
    }, 500);
  },
  optionClass(kind, value) {
    const h = this.house;
    if (!h._showAnswer) return this.picks[kind] === value ? "ring-2 ring-yellow-400" : "";
    const isCorrect = h[kind] === value;
    const picked = this.picks[kind] === value;
    if (isCorrect) return "ring-2 ring-green-500";
    if (picked && !isCorrect) return "ring-2 ring-red-500 opacity-50";
    return "opacity-50";
  },
  resetPicks() {
    this.picks = { beds: null, chest: null, craft: null };
    const h = this.house;
    if (h) delete h._showAnswer;
  },

  /* DOM mount helpers (called from index.html) */
  async mount(cardEl) {
    await this.loadBiome(this.biome);

    // Build the card’s inner HTML once (less Alpine template noise)
    cardEl.innerHTML = `
      <div class="p-5 border border-gray-700 rounded-2xl bg-gray-800" x-show="$store.quiz.house">
        <img :src="$store.quiz.house.image" :alt="$store.quiz.house.name" class="w-full mb-4 rounded" />

        <!-- Beds row -->
        <div class="mb-3">
          <p class="mb-1 font-semibold">Beds</p>
          <div class="grid grid-cols-4 gap-2">
            ${BED_OPTS.map(v => `
              <button @click="$store.quiz.select('beds', ${v})"
                      :class="$store.quiz.optionClass('beds', ${v})"
                      class="rounded p-1 border border-gray-600">
                <img src="${ICONS.beds(v)}" alt="${v} beds" class="w-12 h-12" />
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Chest row -->
        <div class="mb-3">
          <p class="mb-1 font-semibold">Chest</p>
          <div class="grid grid-cols-4 gap-2">
            ${CHEST_OPTS.map(t => `
              <button @click="$store.quiz.select('chest', '${t}')"
                      :class="$store.quiz.optionClass('chest', '${t}')"
                      class="rounded p-1 border border-gray-600">
                <img src="${ICONS.chest(t)}" alt="${t} chest" class="w-12 h-12" />
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Craft row (only desert) -->
        <template x-if="$store.quiz.showCraft">
          <div class="mb-3">
            <p class="mb-1 font-semibold">Crafting Table</p>
            <div class="grid grid-cols-2 gap-2">
              ${CRAFT_OPTS.map(flag => `
                <button @click="$store.quiz.select('craft', ${flag})"
                        :class="$store.quiz.optionClass('craft', ${flag})"
                        class="rounded p-1 border border-gray-600">
                  <img src="${ICONS.craft(flag)}" alt="${flag ? 'Yes' : 'No'}" class="w-12 h-12" />
                </button>
              `).join("")}
            </div>
          </div>
        </template>

        <button @click="$store.quiz.submit()"
                :disabled="!$store.quiz.ready"
                class="mt-2 w-full py-2 rounded bg-emerald-600 disabled:bg-gray-700 font-semibold">
          Submit
        </button>
      </div>
    `;
    Alpine.initTree(cardEl);
  },
  initBiomeSwitcher(containerEl) {
    containerEl.innerHTML = BIOMES.map(b => `
      <button @click="$store.quiz.loadBiome('${b}')"
              :class="{'bg-emerald-600': $store.quiz.biome==='${b}'}"
              class="px-3 py-1 mx-1 rounded bg-gray-700 hover:bg-gray-600 capitalize">${b}</button>
    `).join("");
    Alpine.initTree(containerEl);
  },
});

Alpine.start();