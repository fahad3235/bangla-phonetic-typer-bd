// Node unit tests for the BanglaTyper transliteration engine.
// Run: node tests/test-logic.mjs   (exit 0 = all pass)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const T = require("../js/logic.js");

const V = (s) => s; // expected strings are written with \uXXXX escapes below

const cases = [
  // [input, expected] \u2014 expectations hand-verified against the documented scheme
  ["Ami", "\u0986\u09ae\u09bf"],
  ["tumi", "\u09a4\u09c1\u09ae\u09bf"],
  ["Dhaka", "\u09a2\u09be\u0995\u09be"],
  ["dhaka", "\u09a7\u09be\u0995\u09be"],            // lowercase dh = DHA; DDAKA needs "Dhaka"
  ["bangladesh", "\u09ac\u09be\u0982\u09b2\u09be\u09a6\u09c7\u09b6"],
  ["bangla", "\u09ac\u09be\u0982\u09b2\u09be"],           // ng -> ANG before l
  ["kotha", "\u0995\u09a5\u09be"],              // o = inherent "aw" after a consonant
  ["kOtha", "\u0995\u09cb\u09a5\u09be"],             // capital O = o-kar
  ["bhalobasa", "\u09ad\u09be\u09b2\u09ac\u09be\u09b8\u09be"],
  ["bhalO", "\u09ad\u09be\u09b2\u09cb"],
  ["kemon AchO?", "\u0995\u09c7\u09ae\u09a8 \u0986\u099b\u09cb?"],
  ["Ami bhalO Achi", "\u0986\u09ae\u09bf \u09ad\u09be\u09b2\u09cb \u0986\u099b\u09bf"],
  ["Amar sOnar bangla", "\u0986\u09ae\u09be\u09b0 \u09b8\u09cb\u09a8\u09be\u09b0 \u09ac\u09be\u0982\u09b2\u09be"],
  ["sthan", "\u09b8\u09cd\u09a5\u09be\u09a8"],            // conjunct
  ["meye", "\u09ae\u09c7\u09af\u09bc\u09c7"],             // y = YA
  ["Yoga", "\u09af\u0997\u09be"],               // Y = JA
  ["YOgA", "\u09af\u09cb\u0997\u09be"],
  ["chobi", "\u099b\u09ac\u09bf"],
  ["rina", "\u09b0\u09bf\u09a8\u09be"],
  ["Rina", "\u09a1\u09bc\u09bf\u09a8\u09be"],             // R = DDA
  ["x", "\u0995\u09cd\u09b7"],
  ["123 ?!", "123 ?!"],          // passthrough
  ["a", "\u0985"],
  ["A", "\u0986"],
  ["ka", "\u0995\u09be"],
  ["k", "\u0995"],                    // bare consonant keeps inherent aw
  ["shundor", "\u09b6\u09c1\u09a8\u09cd\u09a6\u09b0"],
  ["ou", "\u0994"],
  ["kou", "\u0995\u09cc"],
  ["kOu", "\u0995\u09cb\u0989"],                // "Ou" is O + u, not the "ou" diphthong
  ["bhai", "\u09ad\u09be\u0987"],               // no "ai" diphthong by design
  ["Bhalo", "\u09ad\u09be\u09b2"],              // capital digraph fallback Bh -> bh
  ["krishti", "\u0995\u09cd\u09b0\u09bf\u09b7\u09cd\u099f\u09bf"],        // sh+t fuses to STA
  ["shanti", "\u09b6\u09be\u09a8\u09cd\u09a4\u09bf"],
  ["shanto", "\u09b6\u09be\u09a8\u09cd\u09a4"],
  ["Rh", "\u09a2\u09bc"],
  ["angk", "\u0985\u0999\u09cd\u0995"],              // ng stays NGA before k
  ["rong", "\u09b0\u0982"],                // ng -> ANG at word end
  ["ranga", "\u09b0\u09be\u0999\u09be"],             // ng stays NGA before a vowel
  ["ora", "\u0993\u09b0\u09be"],                // word-initial o = O
  ["boishakh", "\u09ac\u09c8\u09b6\u09be\u0996"],         // oi = OI
  ["SH", "\u09b6"],                   // unknown capitals act as lowercase
  ["TH", "\u099f\u09cd\u09b9"],                 // T is a real token (TTA)
  ["Th", "\u09a0"],
  ["kha", "\u0996\u09be"],
  ["ghor", "\u0998\u09b0"],
  ["chad", "\u099b\u09be\u09a6"],
  ["", ""],
  ["   ", "   "],
];

let pass = 0, fail = 0;
for (const [inp, exp] of cases) {
  const got = T.transliterate(inp);
  if (got === V(exp)) { pass++; }
  else {
    fail++;
    console.log("FAIL " + JSON.stringify(inp) + "\n  got:  " + JSON.stringify(got) + "\n  want: " + JSON.stringify(V(exp)));
  }
}

// tokenize sanity: digraphs must win over single letters
const tok = (s) => T.tokenize(s).map((t) => t.key).join(",");
const tokCases = [
  ["kotha", "k,o,th,a"],
  ["Dhaka", "Dh,a,k,a"],
  ["Bhalo", "bh,a,l,o"],
  ["krishti", "k,r,i,sh,t,i"],
];
for (const [inp, exp] of tokCases) {
  if (tok(inp) === exp) { pass++; }
  else { fail++; console.log("FAIL tokenize " + JSON.stringify(inp) + " got " + tok(inp) + " want " + exp); }
}

console.log(pass + " passed, " + fail + " failed (" + (pass + fail) + " total)");
process.exit(fail ? 1 : 0);
