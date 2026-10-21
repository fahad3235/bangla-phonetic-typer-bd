/* Bangla Phonetic Typer BD - app wiring (DOM). Pure-ASCII file. */
"use strict";

(function () {
  var LANG_KEY = "bpt-lang";
  var lang = "en";
  try {
    lang = localStorage.getItem(LANG_KEY) || "en";
    if (lang !== "bn") lang = "en";
  } catch (e) { lang = "en"; }

  var $ = function (id) { return document.getElementById(id); };
  var input = $("romanInput"), output = $("banglaOutput"),
      inCount = $("inCount"), outCount = $("outCount"),
      langBtn = $("langBtn");

  function t(key) { return TyperI18n.get(lang)[key]; }

  function render() {
    var src = input.value;
    var bn = BanglaTyper.transliterate(src);
    // textContent keeps it XSS-safe; show placeholder only when empty.
    output.textContent = "";
    if (bn) {
      output.textContent = bn;
    } else {
      var ph = document.createElement("span");
      ph.className = "placeholder";
      ph.textContent = t("outPh");
      output.appendChild(ph);
    }
    var words = bn.trim() ? bn.trim().split(/\s+/).length : 0;
    inCount.textContent = src.length + " " + t("chars");
    outCount.textContent = bn.length + " " + t("chars") + " \u00b7 " + words + " " + t("words");
  }

  function applyLang() {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-i18n");
      if (t(key) !== undefined) els[i].textContent = t(key);
    }
    var phs = document.querySelectorAll("[data-i18n-ph]");
    for (var j = 0; j < phs.length; j++) {
      var pk = phs[j].getAttribute("data-i18n-ph");
      if (t(pk) !== undefined) phs[j].setAttribute("placeholder", t(pk));
    }
    langBtn.textContent = t("langBtn");
    document.title = t("appTitle") + " BD";
    renderTips();
    render();
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  function renderTips() {
    var ul = $("tipsList");
    ul.textContent = "";
    var tips = t("tips");
    for (var i = 0; i < tips.length; i++) {
      var li = document.createElement("li");
      li.textContent = tips[i];
      ul.appendChild(li);
    }
  }

  function buildChart() {
    var vt = $("vowelTable"), ct = $("consTable");
    var vrows = [["a", "A"], ["i", "I"], ["u", "U"], ["e", "E"],
                 ["o", "O"], ["w", "oi"], ["ou", "\u2014"]];
    vrows.forEach(function (pair) {
      var tr = document.createElement("tr");
      pair.forEach(function (k) {
        var td = document.createElement("td");
        if (k === "\u2014") { td.textContent = "\u2014"; }
        else {
          var v = BanglaTyper.VOWELS[k];
          var show = v.kar === "" ? "(inherent \u0985)" : v.kar;
          td.textContent = k + " \u2192 " + v.ind + " / " + show;
        }
        tr.appendChild(td);
      });
      vt.appendChild(tr);
    });
    var crows = [["k", "kh", "g", "gh", "ng"], ["c", "ch", "j", "jh", "\u2014"],
                 ["T", "Th", "D", "Dh", "N"], ["t", "th", "d", "dh", "n"],
                 ["p", "ph", "b", "bh", "m"], ["y / Y", "r", "l", "R", "Rh"],
                 ["sh", "Sh", "s", "h", "x"], ["q", "f", "v", "z", "\u2014"]];
    crows.forEach(function (row) {
      var tr = document.createElement("tr");
      row.forEach(function (k) {
        var td = document.createElement("td");
        if (k === "\u2014") { td.textContent = "\u2014"; }
        else if (k === "y / Y") { td.textContent = "y \u2192 \u09af\u09bc \u00b7 Y \u2192 \u09af"; }
        else {
          var c = BanglaTyper.CONSONANTS[k];
          td.textContent = k + " \u2192 " + (c.cluster ? c.cluster[0] + "\u09cd" + c.cluster[1] : c);
        }
        tr.appendChild(td);
      });
      ct.appendChild(tr);
    });
  }

  function buildChips() {
    var wrap = $("exampleChips");
    wrap.textContent = "";
    var label = document.createElement("span");
    label.className = "chips-label";
    label.textContent = t("examples");
    wrap.appendChild(label);
    TyperI18n.EXAMPLES.forEach(function (ex) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = ex;
      b.addEventListener("click", function () {
        input.value = ex;
        render();
        input.focus();
      });
      wrap.appendChild(b);
    });
  }

  function copyOutput() {
    var text = BanglaTyper.transliterate(input.value);
    var done = function (ok) {
      var btn = $("copyBtn");
      btn.textContent = ok ? t("copied") : t("copyFail");
      setTimeout(function () { btn.textContent = t("copy"); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(!!ok);
      } catch (e) { done(false); }
    }
  }

  function downloadTxt() {
    var text = BanglaTyper.transliterate(input.value);
    var blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = t("fileName");
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 500);
  }

  input.addEventListener("input", render);
  $("copyBtn").addEventListener("click", copyOutput);
  $("dlBtn").addEventListener("click", downloadTxt);
  $("clearBtn").addEventListener("click", function () { input.value = ""; render(); input.focus(); });
  langBtn.addEventListener("click", function () {
    lang = lang === "en" ? "bn" : "en";
    buildChips();
    applyLang();
  });

  buildChart();
  buildChips();
  applyLang();

  // Test hook (used by the headless-Chrome smoke suite).
  window.__typer = {
    transliterate: BanglaTyper.transliterate,
    tokenize: BanglaTyper.tokenize,
    getLang: function () { return lang; },
    setInput: function (v) { input.value = v; render(); },
    getOutput: function () { return output.textContent; }
  };
})();
