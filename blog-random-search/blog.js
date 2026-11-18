(function () {
  "use strict";
  // Stable anchors identify equations; numbers follow their order in the post.
  const equationNumbers = new Map();
  document.querySelectorAll("[data-equation]").forEach((equation, index) => {
    const number = index + 1;
    equationNumbers.set(equation.id, number);
    const label = equation.querySelector(".equation-number");
    label.textContent = `(${number})`;
    label.setAttribute("aria-label", `Equation ${number}`);
  });
  document.querySelectorAll("[data-equation-ref]").forEach((reference) => {
    const number = equationNumbers.get(reference.hash.slice(1));
    if (number === undefined) return;
    reference.textContent = `(${number})`;
    reference.setAttribute("aria-label", `Equation ${number}`);
  });

  function revealEquation(realign = false) {
    const id = window.location.hash.slice(1);
    if (!equationNumbers.has(id)) return;
    const equation = document.getElementById(id);
    let details = equation.closest("details");
    let opened = false;
    while (details) {
      if (!details.open) { details.open = true; opened = true; }
      details = details.parentElement.closest("details");
    }
    if (opened || realign) {
      equation.scrollIntoView({ block: "start", behavior: realign ? "instant" : "smooth" });
    }
  }
  window.addEventListener("hashchange", () => revealEquation());
  // Fonts and the interactive figure can change the height above a deep link.
  const realignEquation = () => requestAnimationFrame(() => revealEquation(true));
  window.addEventListener("load", realignEquation);
  window.addEventListener("whitening-ready", realignEquation);
  if (document.fonts) document.fonts.ready.then(realignEquation);
  revealEquation();

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    const code = document.getElementById(button.dataset.copyTarget);
    const status = document.getElementById(button.getAttribute("aria-describedby"));
    if (!code || !status) return;
    let resetTimer;

    button.addEventListener("click", async () => {
      let copied = false;
      try {
        await navigator.clipboard.writeText(code.textContent);
        copied = true;
      } catch (_) {
        // Keep the text selected for manual copying if clipboard access is denied.
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        try { copied = document.execCommand("copy"); } catch (_) { /* Use manual copying. */ }
      }
      clearTimeout(resetTimer);
      button.textContent = copied ? "Copied!" : "Copy BibTeX";
      status.textContent = copied ? "BibTeX copied to clipboard."
        : "Select the BibTeX text and copy it with your keyboard or device’s copy command.";
      if (copied) resetTimer = setTimeout(() => { button.textContent = "Copy BibTeX"; }, 2500);
    });

    button.hidden = false;
  });
}());
