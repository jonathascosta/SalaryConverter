import './styles/fonts.css';
import './styles/base.css';
import './styles/app.css';
import { convert, type Base } from './lib/convert';
import {
  CURRENCIES,
  CURRENCY_NAMES,
  CURRENCY_PLURALS,
  formatMoney,
  formatPlain,
  parseAmount,
  type Currency,
} from './lib/money';
import {
  DEFAULT_WORK_TIME,
  PERIODS,
  PERIOD_LABELS,
  hoursIn,
  isValidWorkTime,
  type Period,
  type WorkTime,
  type WorkTimeKey,
} from './lib/periods';
import { MAX_AGE, fetchRates, loadCachedRates, saveCachedRates, type RateSheet } from './lib/rates';
import { loadBase, loadWorkTime, saveBase, saveWorkTime } from './lib/storage';
import { readState, writeState } from './lib/url-state';
import { initAds } from './ui/ads';
import { initThemeToggle } from './ui/theme';

/** Numbers follow the reader's own locale ("R$15,000.00" or "15 000,00 R$"). */
const locale = new Intl.NumberFormat().resolvedOptions().locale;

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sheetElement = byId('sheet');
const ratesElement = byId('rates');
const shareButton = byId<HTMLButtonElement>('share');
const shareLabel = byId('share-label');
const settingsError = byId('settings-error');
const announcer = byId('announcer');
const workTimeInputs = [...document.querySelectorAll<HTMLInputElement>('[data-work-time]')];

// ---------------------------------------------------------------------------
// State: the amount typed (base), the working time and the exchange rates.
// A link wins over what was saved in this browser.
// ---------------------------------------------------------------------------

const shared = readState(location.search);
let workTime: WorkTime = { ...loadWorkTime(), ...shared.workTime };
let base: Base | null = shared.base ?? loadBase() ?? defaultBase();
let rateSheet: RateSheet | null = loadCachedRates();
let ratesStatus: 'loading' | 'ready' | 'stale' | 'failed' = rateSheet ? 'ready' : 'loading';
/** The cell being edited keeps what the player types; every other cell is recalculated. */
let editing: HTMLInputElement | null = null;

/** A first example in the reader's own currency, when there is one here. */
function defaultBase(): Base {
  const region = new Intl.Locale(locale).maximize().region;
  const currency: Currency = region === 'BR' ? 'BRL' : region === 'US' ? 'USD' : region === 'GB' ? 'GBP' : 'EUR';
  return { amount: currency === 'BRL' ? 10_000 : currency === 'USD' ? 5000 : 3000, currency, period: 'month' };
}

// ---------------------------------------------------------------------------
// The table: one row per period, one column per currency, every cell editable.
// ---------------------------------------------------------------------------

interface Cell {
  input: HTMLInputElement;
  period: Period;
  currency: Currency;
}

const cells: Cell[] = [];
const hourLabels = new Map<Period, HTMLElement>();

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

sheetElement.append(element('div', 'corner'));
for (const currency of CURRENCIES) {
  const head = element('div', 'col-head');
  head.append(element('span', 'col-code', currency), element('span', 'col-name', CURRENCY_NAMES[currency]));
  head.setAttribute('aria-hidden', 'true');
  sheetElement.append(head);
}
for (const period of PERIODS) {
  const head = element('div', 'row-head');
  const hours = element('span', 'row-hours');
  head.append(element('span', 'row-label', PERIOD_LABELS[period]), hours);
  hourLabels.set(period, hours);
  sheetElement.append(head);

  for (const currency of CURRENCIES) {
    const field = element('div', 'field');
    const code = element('span', 'field-code', currency);
    code.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input');
    input.className = 'amount';
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', `${PERIOD_LABELS[period]}, in ${CURRENCY_PLURALS[currency]}`);
    field.append(code, input);
    sheetElement.append(field);
    cells.push({ input, period, currency });
  }
}

const cellOf = (target: EventTarget | null) => cells.find((cell) => cell.input === target);

function setInvalid(input: HTMLInputElement, invalid: boolean): void {
  if (invalid) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}
const valueOf = ({ period, currency }: Cell) =>
  base && convert(base, { period, currency }, hoursIn(workTime), rateSheet?.rates ?? null);
const round = (value: number) => Math.round(value * 100) / 100;

function render(): void {
  const hours = hoursIn(workTime);
  for (const period of PERIODS) {
    hourLabels.get(period)!.textContent = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(hours[period])} h`;
  }
  for (const cell of cells) {
    const { input, period, currency } = cell;
    input.classList.toggle('is-base', base?.period === period && base.currency === currency);
    if (input === editing) continue;
    const value = valueOf(cell);
    input.value = value === null ? '' : formatMoney(value, currency, locale);
    // Without exchange rates only the base currency converts.
    input.placeholder = base && value === null ? '—' : '';
  }
  renderRates();
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

let selectOnMouseUp = false;

sheetElement.addEventListener('focusin', (event) => {
  const cell = cellOf(event.target);
  if (!cell) return;
  editing = cell.input;
  // Edit the plain number ("2918.29"), all selected so typing replaces it.
  const value = valueOf(cell);
  cell.input.value = value === null ? '' : formatPlain(round(value), locale);
  cell.input.select();
  selectOnMouseUp = true;
  // Mobile Safari only selects once focus has settled.
  setTimeout(() => editing === cell.input && cell.input.setSelectionRange(0, cell.input.value.length));
});

// The mouseup that focused the cell would otherwise put the caret back and undo the selection.
sheetElement.addEventListener('mouseup', (event) => {
  if (selectOnMouseUp && cellOf(event.target)) event.preventDefault();
  selectOnMouseUp = false;
});

sheetElement.addEventListener('input', (event) => {
  const cell = cellOf(event.target);
  if (!cell) return;
  selectOnMouseUp = false;
  const text = cell.input.value;
  const amount = text.trim() ? parseAmount(text, locale) : null;
  const invalid = text.trim() !== '' && amount === null;
  setInvalid(cell.input, invalid);
  if (invalid) return;
  base = amount === null ? null : { amount, currency: cell.currency, period: cell.period };
  render();
  persist();
});

sheetElement.addEventListener('focusout', (event) => {
  const cell = cellOf(event.target);
  if (!cell) return;
  editing = null;
  cell.input.removeAttribute('aria-invalid');
  render();
});

// Up and down arrows (and Enter) move between periods, as in a spreadsheet.
sheetElement.addEventListener('keydown', (event) => {
  const cell = cellOf(event.target);
  if (!cell || event.altKey || event.ctrlKey || event.metaKey) return;
  const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' || event.key === 'Enter' ? 1 : 0;
  if (!step) return;
  const next = cells.find(
    (other) => other.currency === cell.currency && PERIODS.indexOf(other.period) === PERIODS.indexOf(cell.period) + step,
  );
  event.preventDefault();
  next?.input.focus();
});

// ---------------------------------------------------------------------------
// Working time
// ---------------------------------------------------------------------------

function renderWorkTime(): void {
  for (const input of workTimeInputs) {
    if (input !== document.activeElement) input.value = formatPlain(workTime[input.dataset.workTime as WorkTimeKey], locale);
    input.removeAttribute('aria-invalid');
  }
  settingsError.textContent = '';
}

const LIMIT_MESSAGES: Record<WorkTimeKey, string> = {
  hoursPerDay: 'Hours per day must be more than 0 and at most 24.',
  daysPerWeek: 'Days per week must be more than 0 and at most 7.',
  daysPerMonth: 'Days per month must be more than 0 and at most 31.',
  monthsPerYear: 'Months per year must be more than 0 and at most 24.',
};

for (const input of workTimeInputs) {
  const key = input.dataset.workTime as WorkTimeKey;
  input.addEventListener('input', () => {
    const value = parseAmount(input.value, locale);
    const valid = value !== null && isValidWorkTime(key, value);
    setInvalid(input, !valid);
    settingsError.textContent = valid ? '' : LIMIT_MESSAGES[key];
    if (!valid) return;
    workTime = { ...workTime, [key]: value };
    render();
    persist();
  });
  input.addEventListener('blur', renderWorkTime);
}

byId('reset').addEventListener('click', () => {
  workTime = { ...DEFAULT_WORK_TIME };
  renderWorkTime();
  render();
  persist();
  announce('Working time reset.');
});

// ---------------------------------------------------------------------------
// Exchange rates
// ---------------------------------------------------------------------------

function renderRates(): void {
  const retry = '<button class="link-button" type="button" data-retry>Try again</button>';
  if (ratesStatus === 'loading') {
    ratesElement.innerHTML = '<p class="rates-note">Loading exchange rates from the Central Bank of Brazil…</p>';
    return;
  }
  if (!rateSheet) {
    ratesElement.innerHTML = `<p class="rates-note is-error">Couldn’t load the exchange rates, so amounts only convert between periods. ${retry}</p>`;
    return;
  }

  const quotedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(rateSheet.quotedAt));
  const list = CURRENCIES.filter((currency) => currency !== 'BRL')
    .map((currency) => {
      const rate = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 }).format(
        rateSheet!.rates[currency],
      );
      return `<li><span class="rate-code">1 ${currency}</span> = ${rate}</li>`;
    })
    .join('');
  const note =
    ratesStatus === 'stale'
      ? `<p class="rates-note is-error">Couldn’t update the exchange rates; these are from ${quotedAt} (Brasília time). ${retry}</p>`
      : `<p class="rates-note">PTAX selling rates from the <a href="https://www.bcb.gov.br/en/financialstability/exchangerates">Central Bank of Brazil</a>, ${quotedAt} (Brasília time).</p>`;
  ratesElement.innerHTML = `<ul class="rate-list">${list}</ul>${note}`;
}

ratesElement.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('[data-retry]')) void refreshRates();
});

async function refreshRates(): Promise<void> {
  if (!rateSheet) {
    ratesStatus = 'loading';
    renderRates();
  }
  try {
    rateSheet = await fetchRates();
    saveCachedRates(rateSheet);
    ratesStatus = 'ready';
  } catch {
    ratesStatus = rateSheet ? 'stale' : 'failed';
  }
  render();
}

// ---------------------------------------------------------------------------
// Link and saving
// ---------------------------------------------------------------------------

const shareUrl = () => `${location.origin}${location.pathname}${writeState(base, workTime)}`;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

/** Keeps the address bar shareable and remembers the table for the next visit. */
function persist(): void {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    history.replaceState(history.state, '', shareUrl());
    saveBase(base);
    saveWorkTime(workTime);
  }, 250);
}

function announce(message: string): void {
  announcer.textContent = '';
  requestAnimationFrame(() => (announcer.textContent = message));
}

// Phones get the share sheet; elsewhere the link goes to the clipboard.
const useShareSheet = 'share' in navigator && window.matchMedia('(pointer: coarse)').matches;
shareLabel.textContent = useShareSheet ? 'Share' : 'Copy link';
let shareTimer: ReturnType<typeof setTimeout> | undefined;

shareButton.addEventListener('click', async () => {
  const url = shareUrl();
  if (useShareSheet) {
    try {
      await navigator.share({ title: 'Salary Converter', url });
    } catch {
      // Closing the share sheet rejects too; nothing to do.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    shareLabel.textContent = 'Link copied';
    announce('Link copied.');
  } catch {
    shareLabel.textContent = 'Copy it from the address bar';
    history.replaceState(history.state, '', url);
  }
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => (shareLabel.textContent = 'Copy link'), 2500);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

byId('year').textContent = String(new Date().getFullYear());
initThemeToggle();
renderWorkTime();
render();
if (!rateSheet || Date.now() - rateSheet.fetchedAt > MAX_AGE) void refreshRates();
initAds();
