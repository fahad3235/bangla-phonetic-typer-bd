/* Bangla Phonetic Typer BD - transliteration engine (pure logic, no DOM).
 *
 * Simplified, documented phonetic scheme (NOT Avro-compatible):
 *  - Case-sensitive digraphs: kh gh ng ch jh Th Dh th dh ph bh sh Sh Rh.
 *    Retroflex set uses capitals: T Th D Dh N Sh. Lowercase dh = DHA.
 *    So "Dhaka" -> DDAKA, while "dhaka" -> DHAKA.
 *  - After a consonant, "a"/"A" = aa-kar: "Dhaka" -> DDAKA.
 *  - "o" after a consonant keeps the inherent "aw" sound (no mark):
 *    "kotha" -> KTA, "bhalobasa" -> VALBASA, "kemon" -> KEMN.
 *    Capital "O" makes the o-kar: "bhalO" -> VALO. Word-initial o = O.
 *  - Consonant + consonant (no vowel between) = hasant conjunct:
 *    "sthan" -> STHAN. "sh"+"t/Th/N" fuse to STA/STHA/SNA: "krishti" -> KRISTI.
 *  - "ng" becomes ANG (anusvara) at word end or before a non-k-borg
 *    consonant: "bangla" -> BANGLA, "rong" -> RNG. Before k/kh/g/gh or a
 *    vowel it stays NGA: "angka" -> ANKA, "ranga" -> RANGA.
 *  - y = YA, Y = JA: "meye" -> MeYe. R = DDA, Rh = DDHA, x = KSSA.
 *  - "oi" = OI-kar, "ou" = OU-kar. There is no "ai" diphthong on purpose:
 *    "bhai" -> VAI.
 *  - A capital with no explicit entry tries its 2-letter lowercase digraph
 *    first ("Bhalo" -> VALO); otherwise it acts as lowercase.
 *  - Digits, punctuation and any other characters pass through unchanged.
 *
 * Pure-ASCII file: every Bengali codepoint is written as a \uXXXX escape.
 */
"use strict";

var BanglaTyper = (function () {
  var HASANT = "\u09cd";
  var ANUSVARA = "\u0982";

  // vowel token -> { ind: standalone form, kar: sign after a consonant
  // ("": inherent "aw", nothing is appended) }
  var VOWELS = {
    a:  { ind: "\u0985", kar: "\u09be" },
    A:  { ind: "\u0986", kar: "\u09be" },
    i:  { ind: "\u0987", kar: "\u09bf" },
    I:  { ind: "\u0988", kar: "\u09c0" },
    u:  { ind: "\u0989", kar: "\u09c1" },
    U:  { ind: "\u098a", kar: "\u09c2" },
    e:  { ind: "\u098f", kar: "\u09c7" },
    E:  { ind: "\u098f", kar: "\u09c7" },
    o:  { ind: "\u0993", kar: "" },
    O:  { ind: "\u0993", kar: "\u09cb" },
    w:  { ind: "\u0993", kar: "" },
    oi: { ind: "\u0990", kar: "\u09c8" },
    ou: { ind: "\u0994", kar: "\u09cc" }
  };

  // consonant token -> Bengali char, or {cluster:[c1,c2]} for x = KSSA
  var CONSONANTS = {
    k: "\u0995", kh: "\u0996", g: "\u0997", gh: "\u0998", ng: "\u0999",
    c: "\u099a", ch: "\u099b", j: "\u099c", jh: "\u099d",
    T: "\u099f", Th: "\u09a0", D: "\u09a1", Dh: "\u09a2", N: "\u09a3",
    t: "\u09a4", th: "\u09a5", d: "\u09a6", dh: "\u09a7", n: "\u09a8",
    p: "\u09aa", ph: "\u09ab", b: "\u09ac", bh: "\u09ad", m: "\u09ae",
    y: "\u09af\u09bc", Y: "\u09af", r: "\u09b0", l: "\u09b2",
    sh: "\u09b6", Sh: "\u09b7", s: "\u09b8", h: "\u09b9",
    R: "\u09a1\u09bc", Rh: "\u09a2\u09bc",
    q: "\u0995", f: "\u09ab", v: "\u09ad", z: "\u099c",
    x: { cluster: ["\u0995", "\u09b7"] }
  };

  // "ng" keeps NGA before these (k-borg); otherwise it becomes ANUSVARA.
  var NG_KEEPS = { k: 1, kh: 1, g: 1, gh: 1 };

  // sh + t/Th/N fuse into the retroflex clusters STA / STHA / SNA.
  var SH_FUSE = { t: "\u099f", Th: "\u09a0", N: "\u09a3" };

  // Capitals with no explicit entry fall back to their lowercase twin.
  var CAP_FALLBACK = {
    B: "b", C: "c", F: "f", G: "g", H: "h", J: "j", K: "k",
    L: "l", M: "m", P: "p", Q: "q", S: "s", V: "v", W: "w",
    X: "x", Z: "z"
  };

  var TOKEN_KEYS = Object.keys(VOWELS)
    .concat(Object.keys(CONSONANTS))
    .sort(function (a, b) { return b.length - a.length; }); // 2-char first

  function lookupToken(key) {
    if (VOWELS[key]) return { type: "vowel", key: key, def: VOWELS[key] };
    if (CONSONANTS[key]) {
      var d = CONSONANTS[key];
      if (d && d.cluster) return { type: "cluster", key: key, def: d };
      return { type: "consonant", key: key, def: d };
    }
    return null;
  }

  // Split input into tokens; anything unmapped becomes a literal token.
  function tokenize(input) {
    var tokens = [];
    var i = 0;
    while (i < input.length) {
      var matched = null;
      for (var k = 0; k < TOKEN_KEYS.length; k++) {
        var key = TOKEN_KEYS[k];
        if (input.substr(i, key.length) === key) { matched = key; break; }
      }
      if (!matched) {
        var ch = input[i];
        // "Bhalo": try the lowercase digraph first, then the single letter.
        if (ch >= "A" && ch <= "Z" && i + 1 < input.length) {
          var two = (ch + input[i + 1]).toLowerCase();
          if (lookupToken(two)) { matched = two; }
        }
        if (!matched) {
          var fb = CAP_FALLBACK[ch];
          if (fb) {
            matched = fb;
          } else {
            tokens.push({ type: "literal", key: ch });
            i += 1;
            continue;
          }
        }
      }
      tokens.push(lookupToken(matched));
      i += matched.length;
    }
    return tokens;
  }

  function isConsToken(t) {
    return t && (t.type === "consonant" || t.type === "cluster");
  }

  function transliterate(input) {
    if (input == null) return "";
    var tokens = tokenize(String(input));
    var out = "";
    var bare = false;      // last emitted unit is a bare consonant
    var prevConsKey = null; // key of that consonant, for sh-fusion
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.type === "vowel") {
        if (bare) {
          out += t.def.kar; // "" for "o"/"w": inherent "aw", no mark
          bare = false;
        } else {
          out += t.def.ind;
        }
        prevConsKey = null;
      } else if (t.type === "consonant" || t.type === "cluster") {
        var ch, fused = null;
        if (t.type === "cluster") {
          ch = null; // handled below
        } else if (t.key === "ng") {
          // NGA vs ANUSVARA decision, based on the next token.
          var nxt = tokens[i + 1];
          var keep = nxt && isConsToken(nxt) && NG_KEEPS[nxt.key];
          if (!keep && (!nxt || nxt.type !== "vowel")) {
            if (bare) out += HASANT;
            out += ANUSVARA;
            bare = false;
            prevConsKey = null;
            continue;
          }
          ch = t.def;
        } else {
          ch = t.def;
        }
        if (t.key === "sh") {
          // Retroflex context: "shti" -> SSTI, not SHTI.
          var after = tokens[i + 1];
          if (after && after.type === "consonant" && SH_FUSE[after.key]) {
            ch = "\u09b7"; // SSA
          }
        }
        if (bare && prevConsKey === "sh" && t.type === "consonant" && SH_FUSE[t.key]) {
          fused = SH_FUSE[t.key];
        }
        if (bare) out += HASANT;
        if (t.type === "cluster") {
          out += t.def.cluster[0] + HASANT + t.def.cluster[1];
        } else if (fused) {
          out += fused;
        } else {
          out += ch;
        }
        bare = true;
        prevConsKey = t.key;
      } else {
        out += t.key; // literal passes through
        bare = false;
        prevConsKey = null;
      }
    }
    return out;
  }

  return {
    HASANT: HASANT,
    ANUSVARA: ANUSVARA,
    VOWELS: VOWELS,
    CONSONANTS: CONSONANTS,
    tokenize: tokenize,
    transliterate: transliterate
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = BanglaTyper;
}
