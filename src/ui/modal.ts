/** A simple full-screen sheet for DOM panels (settings, lists, dialogs). */
export function openModal(title: string, build: (body: HTMLElement, close: () => void) => void): () => void {
  const root = document.getElementById('modal-root')!;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const sheet = document.createElement('section');
  sheet.className = 'modal';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', title);
  sheet.innerHTML = `<header><h2></h2><button class="btn close" aria-label="Close">✕</button></header><div class="modal-body"></div>`;
  sheet.querySelector('h2')!.textContent = title;
  backdrop.appendChild(sheet);
  root.appendChild(backdrop);

  const close = () => backdrop.remove();
  sheet.querySelector('.close')!.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  build(sheet.querySelector('.modal-body') as HTMLElement, close);
  return close;
}

/** Tiny element helper. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const c of children) e.append(c);
  return e;
}

export interface HintBar {
  set(text: string): void;
  close(): void;
}

/** A small instruction strip over the play area, with an optional button (e.g. "Done"). */
export function showHint(text: string, button?: { label: string; onClick: () => void }): HintBar {
  document.getElementById('hint-bar')?.remove();
  const bar = el('div', {});
  bar.id = 'hint-bar';
  const span = el('span', { textContent: text });
  bar.append(span);
  if (button) {
    const b = el('button', { className: 'btn', textContent: button.label });
    b.addEventListener('click', button.onClick);
    bar.append(b);
  }
  document.getElementById('stage')!.appendChild(bar);
  return {
    set: (t) => (span.textContent = t),
    close: () => bar.remove(),
  };
}

export function toast(text: string, ms = 2600): void {
  const t = el('div', { className: 'toast', textContent: text });
  document.getElementById('modal-root')!.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, ms);
}
