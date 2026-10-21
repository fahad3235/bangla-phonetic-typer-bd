# Bangla Phonetic Typer BD

Offline, bilingual (EN/বাংলা) Bangla phonetic typing tool. Type Roman letters,
get Bangla script live — a small playground for writing Bangla on any
English keyboard. 100% client-side: nothing is uploaded anywhere.

**Live demo:** https://fahad3235.github.io/bangla-phonetic-typer-bd/

## The problem

Millions of Bangladeshis write Bangla online every day, but most keyboards
only have Roman letters. Full phonetic engines (Avro, Bijoy) are separate
apps to install. This is a zero-install, offline web page: open it, type,
copy the Bangla text wherever you need it.

## Features

1. **Live transliteration** — every keystroke in the Roman box instantly
   renders Bangla script next to it.
2. **Copy & Download** — one-tap copy to clipboard, or download the Bangla
   text as a UTF-8 `.txt` file.
3. **Phonetic chart** — the full mapping (vowels, consonants, retroflex
   capitals) rendered from the same tables the engine uses, so docs and
   behavior can't drift apart.
4. **Typing tips** — the 7 rules of the scheme with examples, in English
   and Bangla.
5. **Example chips** — one tap loads a sample sentence.
6. **EN/বাংলা UI toggle** — persisted in `localStorage`, with Bengali
   digits in the counters.
7. **Live counters** — input/output character counts and output word count.

## The phonetic scheme (simplified — NOT Avro-compatible)

| Rule | Example |
|---|---|
| `a`/`A` after a consonant = আ-কার | `Dhaka` → ঢাকা |
| `o` after a consonant = inherent "aw" (no mark) | `kotha` → কথা |
| Capital `O` = ও-কার; word-initial `o` = ও | `bhalO` → ভালো |
| Consonant pairs join with হসন্ত | `sthan` → স্থান |
| `sh`+t/Th/N fuses to ষ্ট/ষ্ঠ/ষ্ণ | `krishti` → ক্রিষ্টি |
| `ng` → ং at word end / before most consonants | `bangla` → বাংলা, `rong` → রং |
| `ng` stays ঙ before k/kh/g/gh or a vowel | `angk` → অঙ্ক, `ranga` → রাঙা |
| `y` = য়, `Y` = য | `meye` → মেয়ে |
| `R` = ড়, `Rh` = ঢ়, `x` = ক্ষ | `Rina` → ড়িনা |
| Capitals: `T Th D Dh N Sh` are retroflex; `Dhaka` → ঢাকা but `dhaka` → ধাকা | |
| Unknown capitals try their lowercase digraph first | `Bhalo` → ভাল |
| Digits, punctuation, other scripts pass through | `123 ?!` unchanged |

Deliberate simplifications: there is no `ai` diphthong (`bhai` → ভাই);
`ou` gives ঔ (`kou` → কৌ). This is a helper, not a scholarly
transliterator — **always proofread the output.**

## Stack

Vanilla HTML/CSS/JS, no dependencies, no build step, no network requests.
The engine (`js/logic.js`) is pure logic with no DOM access, so it is
unit-tested directly in Node.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
cd bangla-phonetic-typer-bd
python3 -m http.server 8000
# open http://localhost:8000
```

## Testing

```bash
node tests/test-logic.mjs   # 53 unit tests (transliteration vectors + tokenizer)
```

Plus a headless-Chrome smoke suite (raw CDP, desktop + 390px mobile):
live typing, example chips, clear, copy (no-throw), BN toggle + persistence,
chart tables, zero console/page errors, zero network requests. Results in
`TEST_RESULTS.md`.

## Deployment

Static site — any static host works. Deployed via GitHub Pages.

## Limitations

- Simplified scheme: approximate output for conjunct-heavy or Perso-Arabic
  loanwords; proofread before publishing.
- Not compatible with Avro/Bijoy key habits (documented differences above).
- No IME integration — it's a web page, not a system keyboard.

## Status

Built 2026-10-21 by the Muse Project Factory (run #105). Offline demo tool,
not a language authority.
