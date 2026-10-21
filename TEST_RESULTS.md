# TEST RESULTS — bangla-phonetic-typer-bd (run #105)

Date: 2026-10-21. All results below are real, from actual runs in this session.

## Unit tests — 53/53 pass

`node tests/test-logic.mjs` — transliteration vectors + tokenizer checks,
hand-verified against the documented scheme. Key vectors:

- `Dhaka` → ঢাকা, `dhaka` → ধাকা (lowercase dh = ধ; ঢ needs capital Dh)
- `kotha` → কথা (`o` = inherent "aw" after a consonant), `kOtha` → কোথা
- `bhalobasa` → ভালবাসা, `bhalO` → ভালো
- `bangladesh` → বাংলাদেশ (`ng` → ং before non-ক-বর্গ consonants)
- `angk` → অঙ্ক (`ng` stays ঙ before k), `ranga` → রাঙা, `rong` → রং
- `krishti` → ক্রিষ্টি (`sh`+t fuses to ষ্ট), `sthan` → স্থান
- `meye` → মেয়ে (`y` = য়), `YOgA` → যোগা (`Y` = য)
- `Rina` → ড়িনা, `rina` → রিনা
- `bhai` → ভাই (no `ai` diphthong by design), `boishakh` → বৈশাখ
- `Bhalo` → ভাল (capital digraph fallback), `123 ?!` passes through
- Tokenizer: `kotha` → k,o,th,a · `Dhaka` → Dh,a,k,a · `Bhalo` → bh,a,l,o

### Repairs during unit testing (real engine bugs fixed)

1. `ng` emitted ঙ+hasant before all consonants → `bangla` gave বাঙ্লাদেশ.
   Fixed: ং (anusvara) at word end / before non-ক-বর্গ consonants; ঙ kept
   before k/kh/g/gh and vowels.
2. `o` initially mapped to ও-কার → `kotha` gave কোথা, `chobi` gave ছোবি.
   Fixed: `o` after a consonant = inherent "aw" (no mark); capital `O` = ও-কার.
3. `ai` diphthong token broke `bhai` → ভৈ. Removed `ai`; kept `oi`/`ou`.
4. `sh`+t gave শ্ট instead of ষ্ট. Fixed: `sh` → ষ in retroflex context + fusion.
5. Capital `B` broke the `bh` digraph (`Bhalo` → ব্হাল). Fixed: 2-char
   lowercase-digraph fallback before single-letter fallback.

## Headless-Chrome smoke — 17/17 pass

`node tests/smoke.mjs` — raw CDP against `/opt/meta-chromium/chrome`
(headless=new), `file://` page, desktop + 390px mobile:

- page title, `window.__typer` hook present
- live transliteration via real input path: `kemon AchO?` → কেমন আছো?
- example chip fills input and renders correct output
- clear button empties input
- copy button click: no page error (clipboard denial handled by fallback)
- BN toggle flips `document.documentElement.lang` to `bn`, heading renders
  বাংলা; persists across `Page.reload`
- vowel chart 7 rows, consonant chart 8 rows, tips list 7 items
- output counter shows chars/words
- 390px mobile: `document.documentElement.scrollWidth` ≤ 390
- **zero console/page errors, zero http(s) requests**

### Repairs during smoke testing

1. `SMOKE HARNESS ERROR: fetch failed` → the ws→http base conversion was
   missing (real harness bug, fixed).
2. `/json/new` needs PUT on Chrome 152 (known run-#101 lesson, fixed).
3. `Uncaught SyntaxError` in `js/i18n.js` — the tips-regeneration script
   wrote unescaped `"` inside string literals (real app bug caught by smoke,
   fixed by re-escaping; `node --check` green on all three JS files).

## ASCII hygiene

`grep -rPn "[\x80-\xFF]"` over `js/`, `tests/`, `index.html`, `css/` → zero
matches. Bengali lives only as `\uXXXX` escapes in JS and numeric entities
in HTML. `README.md` intentionally ships as UTF-8 (documentation readability;
`push-files` reads UTF-8 from disk safely).
