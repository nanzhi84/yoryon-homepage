import { formatLifeDays, getLifeDays } from "../lib/life-clock";

const counter = document.querySelector<HTMLElement>("[data-life-days]");

if (counter) {
  const update = () => {
    counter.textContent = formatLifeDays(getLifeDays());
  };
  update();
  // A daily counter needs no animation; the minute check also recovers clock changes.
  window.setInterval(update, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
  window.addEventListener("pageshow", update);
}
