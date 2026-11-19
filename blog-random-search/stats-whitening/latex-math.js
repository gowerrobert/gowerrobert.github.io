(function () {
  "use strict";
  const assets = new URL("../vendor/mathjax-3.2.2/", document.currentScript.src);
  window.MathJax = {
    loader: { paths: { mathjax: assets.href } },
    chtml: { fontURL: new URL("fonts/", assets).href },
    options: { enableMenu: false },
    startup: {
      ready() {
        MathJax.startup.defaultReady();
        MathJax.startup.promise.then(() => {
          window.dispatchEvent(new Event("math-rendered"));
        });
      },
    },
  };
}());
