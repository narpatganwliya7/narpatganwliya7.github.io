// Nav state, mobile menu, and the impact count-up (the page's one scroll moment).
(() => {
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("solid", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const btn = document.querySelector(".menu");
  const menu = document.getElementById("mobile-menu");
  const setMenu = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
    nav.classList.toggle("solid", open || window.scrollY > 40);
  };
  btn.addEventListener("click", () => setMenu(btn.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nums = document.querySelectorAll("[data-count]");
  if (reduce || !("IntersectionObserver" in window)) return;
  const run = (el) => {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.querySelectorAll("[data-count]").forEach(run);
      io.unobserve(en.target);
    });
  }, { threshold: 0.4 });
  const box = document.querySelector(".stats");
  if (box && nums.length) io.observe(box);
})();
