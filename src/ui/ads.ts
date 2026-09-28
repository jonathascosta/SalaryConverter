declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT = 'ca-pub-2968705923738055';
const LIVE_HOST = 'salary-converter.jonathas.net';

/**
 * Fills the AdSense slots (elements with data-slot) once they have a size on screen.
 *
 * AdSense can't size a unit that has no width (the side slot is hidden on narrow screens), and
 * each push() fills the first unfilled unit on the page. So each <ins> is only created when its
 * slot becomes visible, right before its push, and a slot that is never shown is never requested.
 * Consent in the EEA and the UK is handled by Google's own consent message (Privacy & messaging
 * in AdSense), which the AdSense script shows before any ad.
 */
export function initAds(): void {
  const slots = document.querySelectorAll<HTMLElement>('[data-slot]');
  if (!slots.length || !('ResizeObserver' in window)) return;

  const observer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (contentRect.width === 0) continue;
      observer.unobserve(target);
      fill(target as HTMLElement);
    }
  });
  slots.forEach((slot) => observer.observe(slot));
}

function fill(slot: HTMLElement): void {
  const unit = document.createElement('ins');
  unit.className = 'adsbygoogle';
  unit.style.display = 'block';
  unit.dataset.adClient = CLIENT;
  unit.dataset.adSlot = slot.dataset.slot;
  unit.dataset.adFormat = 'auto';
  unit.dataset.fullWidthResponsive = 'true';
  // Anywhere but the live site (local development, previews), ask for test ads: no impressions are counted.
  if (location.hostname !== LIVE_HOST) unit.dataset.adtest = 'on';
  slot.append(unit);
  try {
    (window.adsbygoogle = window.adsbygoogle ?? []).push({});
  } catch {
    // The AdSense script reports its own errors; the slot just stays empty.
  }
}
