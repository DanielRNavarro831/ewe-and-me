import Phaser from 'phaser';
import { Minigame } from './Minigame';
import { game } from '../game';
import type { Yarn } from '../systems/state';
import { ACID_AMOUNTS, DYE_TEMP, DYES, MAX_DOS_PER_DYE, type DyeAmounts, type Technique } from '../data/dyes';
import { breed, naturalColor } from '../data/breeds';
import {
  acid, availableDyes, dosFromMl, dyeBatch, findColorway, NO_DYE, playableTechniques, stockMl, techniqueUnlocked,
} from '../systems/dye';
import { dyedColor, hexToRgb, rgbToHex, suggestColorwayName } from '../systems/color';
import { unlock } from '../systems/achievements';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';
import { el, openModal, toast } from '../ui/modal';
import { yarnName } from '../systems/workshop';

type Step = 'soak' | 'dye' | 'acid' | 'heat' | 'done';

const EXHAUST_SECONDS = 10;
const CLEAR_WATER = '#BFD8E8';

const toF = (c: number) => Math.round((c * 9) / 5 + 32);

function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/**
 * The acid dye process: pre-soak (wetting out), measure dye from 1% stock
 * solutions, add acid, heat to about 85°C and hold while the bath exhausts,
 * then rinse and hang to dry. Too little acid or heat just gives a paler
 * result with dye left in the pot; nothing fails.
 */
export class DyeScene extends Minigame {
  private yarns: Yarn[] = [];
  private step: Step = 'soak';
  private presoaked = false;
  private ml: DyeAmounts = { ...NO_DYE };
  private technique: Technique['id'] = 'immersion';
  private acidFactor = 1;
  private temp = 35;
  private heating = false;
  private progress = 0;
  private scoreSum = 0;
  private scoreTime = 0;
  private repeating: string | null = null;

  private water!: Phaser.GameObjects.Ellipse;
  private skeinGfx!: Phaser.GameObjects.Graphics;
  private flames!: Phaser.GameObjects.Graphics;
  private thermo!: Phaser.GameObjects.Rectangle;
  private thermoTop = 0;
  private thermoH = 0;
  private ui!: HTMLElement;
  private progressBar: HTMLElement | null = null;
  private tempLabel: HTMLElement | null = null;
  private potX = 0;
  private potY = 0;

  constructor() {
    super('Dye');
  }

  init(data: { itemId?: string; yarnIds?: string[]; colorwayId?: string }): void {
    this.returnTo = 'DyeStudio';
    this.finished = false;
    this.yarns = (data.yarnIds ?? []).map((id) => game.state.yarns.find((y) => y.id === id)!).filter(Boolean);
    this.step = 'soak';
    this.presoaked = false;
    this.ml = { ...NO_DYE };
    this.technique = 'immersion';
    this.acidFactor = 1;
    this.temp = 35;
    this.heating = false;
    this.progress = 0;
    this.scoreSum = 0;
    this.scoreTime = 0;
    this.progressBar = null;
    this.tempLabel = null;
    this.repeating = null;
    const cw = data.colorwayId ? game.state.colorways.find((c) => c.id === data.colorwayId) : undefined;
    if (cw) {
      this.repeating = cw.name;
      const g = this.grams();
      this.ml = {
        red: stockMl(cw.dos.red, g),
        yellow: stockMl(cw.dos.yellow, g),
        blue: stockMl(cw.dos.blue, g),
        black: stockMl(cw.dos.black, g),
      };
      this.technique = cw.technique as Technique['id'];
    }
  }

  private grams(): number {
    return this.yarns.reduce((a, y) => a + y.grams, 0);
  }

  private dos(): DyeAmounts {
    const g = this.grams();
    const round = (v: number) => Math.round(v * 100) / 100;
    return {
      red: round(dosFromMl(this.ml.red, g)),
      yellow: round(dosFromMl(this.ml.yellow, g)),
      blue: round(dosFromMl(this.ml.blue, g)),
      black: round(dosFromMl(this.ml.black, g)),
    };
  }

  /** Expected color on a skein for a given uptake. */
  private colorFor(y: Yarn, uptake: number): string {
    const b = breed(y.breedId);
    const d = this.dos();
    const taken = { red: d.red * uptake, yellow: d.yellow * uptake, blue: d.blue * uptake, black: d.black * uptake };
    return dyedColor({ dos: taken, baseHex: naturalColor(b, y.colorId).hex, luster: b.luster, crimp: b.crimp });
  }

  create(): void {
    this.setup(this.repeating ? `Dyeing ${this.repeating}` : 'Dye pot', 'wood');
    const { W } = this;
    this.potX = W / 2 - 10;
    this.potY = 250;

    // jars of 1% stock on a shelf
    const shelf = this.add.graphics();
    shelf.fillStyle(hex('o')).fillRect(14, 146, W - 28, 6);
    shelf.fillStyle(hex('W')).fillRect(16, 147, W - 32, 4);
    DYES.forEach((d, i) => {
      const x = 34 + i * 30;
      shelf.fillStyle(hex('o')).fillRect(x - 9, 118, 18, 28);
      shelf.fillStyle(hex('w')).fillRect(x - 7, 120, 14, 25);
      shelf.fillStyle(parseInt(d.jar.slice(1), 16)).fillRect(x - 6, 128, 12, 16);
      shelf.fillStyle(hex('D')).fillRect(x - 8, 116, 16, 4);
    });

    // stove, pot and water
    const g = this.add.graphics();
    g.fillStyle(hex('o')).fillRect(this.potX - 78, this.potY + 50, 156, 70);
    g.fillStyle(hex('n')).fillRect(this.potX - 76, this.potY + 52, 152, 66);
    g.fillStyle(hex('m')).fillRect(this.potX - 40, this.potY + 74, 80, 30);
    this.flames = this.add.graphics();
    g.fillStyle(hex('o')).fillRect(this.potX - 66, this.potY - 30, 132, 84);
    g.fillStyle(hex('g')).fillRect(this.potX - 64, this.potY - 28, 128, 80);
    g.fillStyle(hex('l')).fillRect(this.potX - 58, this.potY - 20, 6, 64);
    g.fillStyle(hex('o')).fillRect(this.potX - 74, this.potY - 18, 10, 8).fillRect(this.potX + 64, this.potY - 18, 10, 8);
    this.add.ellipse(this.potX, this.potY - 30, 136, 26, hex('o'));
    this.add.ellipse(this.potX, this.potY - 30, 130, 22, hex('l'));
    this.water = this.add.ellipse(this.potX, this.potY - 29, 120, 16, parseInt(CLEAR_WATER.slice(1), 16));
    this.skeinGfx = this.add.graphics();

    // thermometer
    const tx = W - 26;
    this.thermoTop = 180;
    this.thermoH = 150;
    this.add.rectangle(tx, this.thermoTop + this.thermoH / 2, 14, this.thermoH + 4, hex('o'));
    this.add.rectangle(tx, this.thermoTop + this.thermoH / 2, 10, this.thermoH, hex('w'));
    const band = (c: number) => this.thermoTop + this.thermoH * (1 - (c - 20) / 80);
    this.add.rectangle(tx, (band(DYE_TEMP.low) + band(DYE_TEMP.high)) / 2, 18, band(DYE_TEMP.low) - band(DYE_TEMP.high), hex('H'), 0.8);
    this.thermo = this.add.rectangle(tx, this.thermoTop + this.thermoH, 6, 0, hex('x')).setOrigin(0.5, 1);
    this.add.circle(tx, this.thermoTop + this.thermoH + 6, 7, hex('x')).setStrokeStyle(2, hex('o'));
    this.add.text(tx, this.thermoTop - 6, '85°C', { fontFamily: 'Pixelify Sans', fontSize: '9px', color: '#F3EAE0' }).setOrigin(0.5, 1).setResolution(4);

    this.time.addEvent({ delay: 300, loop: true, callback: () => this.steam() });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.stir(p));

    this.ui = this.controls();
    this.showSoak();
    this.drawSkeins(0);
  }

  /* ---------- steps ---------- */

  private showSoak(): void {
    this.step = 'soak';
    this.hint.set(`${this.yarns.length} skein${this.yarns.length > 1 ? 's' : ''} in the pot, ${this.grams()} g in all. Wet them out first so the dye takes evenly.`);
    this.ui.innerHTML = '';
    const soak = el('button', { className: 'btn primary', textContent: 'Pre-soak the skeins' });
    soak.addEventListener('click', () => {
      soak.disabled = true;
      playSfx('water_slosh');
      this.hint.set('Soaking in warm water with a drop of wool wash…');
      this.time.delayedCall(1600, () => {
        this.presoaked = true;
        this.showDye();
      });
    });
    const skip = el('button', { className: 'btn', textContent: 'Skip it' });
    skip.addEventListener('click', () => {
      this.presoaked = false;
      this.showDye();
    });
    this.ui.append(el('div', { className: 'btn-row' }, [soak, skip]));
  }

  private showDye(): void {
    this.step = 'dye';
    this.hint.set(
      this.repeating
        ? `Repeating ${this.repeating} from the swatch book. Measured for ${this.grams()} g of fiber.`
        : 'Measure dye from the 1% stock solutions. 1 ml of stock is 0.01 g of dye.',
    );
    const g = this.grams();
    const maxMl = stockMl(MAX_DOS_PER_DYE, g);
    this.ui.innerHTML = '';
    const preview = el('span', { className: 'swatch big' });
    const total = el('span', {});
    const refresh = () => {
      const d = this.dos();
      const sum = d.red + d.yellow + d.blue + d.black;
      total.textContent = `DOS ${sum.toFixed(2)}% · ${sum === 0 ? 'no dye yet' : sum < 0.5 ? 'pale' : sum < 2 ? 'medium' : 'deep'}`;
      preview.style.background = this.colorFor(this.yarns[0], acid(game.state).efficiency);
      this.drawSkeins(0);
      this.water.setFillStyle(parseInt(mixHex(CLEAR_WATER, this.colorFor(this.yarns[0], 1), Math.min(1, sum / 1.5) * 0.85).slice(1), 16));
    };
    const avail = availableDyes(game.state).map((d) => d.id);
    for (const d of DYES) {
      if (!avail.includes(d.id)) {
        this.ui.append(el('p', { className: 'hint', textContent: `${d.name} unlocks after your first dye batch.` }));
        continue;
      }
      const read = el('span', { className: 'dye-read' });
      const input = el('input', { type: 'range', min: '0', max: String(maxMl), step: String(Math.max(1, Math.round(maxMl / 160))), value: String(this.ml[d.id]) });
      input.style.accentColor = d.jar;
      const show = () => (read.textContent = `${this.ml[d.id]} ml · ${dosFromMl(this.ml[d.id], g).toFixed(2)}%`);
      input.addEventListener('input', () => {
        this.ml[d.id] = Number(input.value);
        show();
        refresh();
      });
      input.addEventListener('change', () => playSfx('dye_pour'));
      show();
      this.ui.append(el('label', { className: 'row dye-row' }, [el('span', { textContent: d.name }), input, read]));
    }

    // technique
    const techRow = el('div', { className: 'choice-group' });
    for (const t of playableTechniques()) {
      const ok = techniqueUnlocked(game.state, t);
      const b = el('button', {
        className: `btn${t.id === this.technique ? ' selected' : ''}`,
        textContent: ok ? `${t.name}: ${t.look.toLowerCase()}` : `${t.name} (shop level ${t.shopLevel})`,
      });
      b.disabled = !ok || (!!this.repeating && t.id !== this.technique);
      b.addEventListener('click', () => {
        this.technique = t.id;
        techRow.querySelectorAll('.btn').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        refresh();
      });
      techRow.append(b);
    }
    const next = el('button', { className: 'btn primary', textContent: 'Into the pot' });
    next.addEventListener('click', () => {
      const d = this.dos();
      if (d.red + d.yellow + d.blue + d.black <= 0) {
        toast('Add some dye first.');
        return;
      }
      playSfx('dye_pour');
      this.showAcid();
    });
    this.ui.append(techRow, el('div', { className: 'row' }, [preview, total, next]));
    refresh();
  }

  private showAcid(): void {
    this.step = 'acid';
    const a = acid(game.state);
    this.hint.set(`Add acid: ${a.name.toLowerCase()} helps the dye bond to the wool.`);
    this.ui.innerHTML = '';
    const row = el('div', { className: 'choice-group' });
    for (const amt of ACID_AMOUNTS) {
      const b = el('button', { className: 'btn', textContent: amt.label });
      b.addEventListener('click', () => {
        this.acidFactor = amt.factor * a.efficiency;
        playSfx('dye_pour');
        this.showHeat();
      });
      row.append(b);
    }
    this.ui.append(row);
  }

  private showHeat(): void {
    this.step = 'heat';
    this.hint.set(
      `Heat to about ${DYE_TEMP.target}°C (${toF(DYE_TEMP.target)}°F) and hold it there while the bath exhausts.` +
        (this.technique === 'kettle' ? ' No stirring: let the dye strike where it was poured.' : ' Stir gently now and then.'),
    );
    this.ui.innerHTML = '';
    this.tempLabel = el('strong', {});
    this.progressBar = el('div', { className: 'bar-fill' });
    const burner = el('button', { className: 'btn primary burner', textContent: 'Hold to heat' });
    const on = (e: Event) => {
      e.preventDefault();
      this.heating = true;
    };
    const off = () => (this.heating = false);
    burner.addEventListener('pointerdown', on);
    burner.addEventListener('pointerup', off);
    burner.addEventListener('pointerleave', off);
    burner.addEventListener('pointercancel', off);
    this.ui.append(
      el('div', { className: 'row' }, [el('span', { textContent: 'Bath' }), this.tempLabel, burner]),
      el('span', { textContent: 'Exhaustion (dye moving into the fiber)' }),
      el('div', { className: 'bar' }, [this.progressBar]),
    );
  }

  /* ---------- simulation ---------- */

  update(_t: number, delta: number): void {
    const dt = delta / 1000;
    if (this.step === 'heat') {
      this.temp += this.heating ? 9 * dt : -1.4 * dt;
      this.temp = Phaser.Math.Clamp(this.temp, 20, 100);
      if (this.temp >= 75) {
        const factor = this.temp < DYE_TEMP.low ? 0.85 : this.temp <= DYE_TEMP.high ? 1 : this.temp <= 97 ? 0.97 : 0.9;
        const rate = this.temp < DYE_TEMP.low ? 0.5 : 1;
        this.progress = Math.min(1, this.progress + (rate * dt) / EXHAUST_SECONDS);
        this.scoreSum += factor * rate * dt;
        this.scoreTime += rate * dt;
      }
      const uptake = this.uptake();
      this.drawSkeins(this.progress);
      const remaining = 1 - this.progress * uptake;
      const d = this.dos();
      const strength = Math.min(1, (d.red + d.yellow + d.blue + d.black) / 1.5) * 0.85;
      this.water.setFillStyle(parseInt(mixHex(CLEAR_WATER, this.colorFor(this.yarns[0], 1), strength * remaining).slice(1), 16));
      if (this.tempLabel) {
        const c = Math.round(this.temp);
        const note = c < 75 ? 'warming' : c < DYE_TEMP.low ? 'nearly there' : c <= DYE_TEMP.high ? 'just right' : c <= 97 ? 'a bit hot' : 'boiling hard';
        this.tempLabel.textContent = `${c}°C (${toF(c)}°F), ${note}`;
      }
      if (this.progressBar) this.progressBar.style.width = `${Math.round(this.progress * 100)}%`;
      if (this.progress >= 1) this.finishBath();
    }
    this.thermo.height = (this.thermoH * Phaser.Math.Clamp(this.temp - 20, 0, 80)) / 80;
    this.drawFlames();
  }

  private uptake(): number {
    const heat = this.scoreTime > 0 ? this.scoreSum / this.scoreTime : 0.85;
    return Phaser.Math.Clamp(this.acidFactor * heat, 0.2, 1);
  }

  private stir(p: Phaser.Input.Pointer): void {
    if (this.step !== 'heat' || !p.isDown || this.technique === 'kettle') return;
    if (Math.abs(p.worldX - this.potX) < 70 && Math.abs(p.worldY - (this.potY - 10)) < 60 && Math.random() < 0.08) playSfx('dye_bubble');
  }

  private drawSkeins(progress: number): void {
    const g = this.skeinGfx;
    g.clear();
    const uptake = this.step === 'heat' || this.step === 'done' ? this.uptake() : 0;
    this.yarns.forEach((y, i) => {
      const x = this.potX - 36 + i * 36;
      const yy = this.potY - 30 + (i % 2) * 3;
      const col = parseInt((progress > 0 ? this.colorFor(y, uptake * progress) : naturalColor(breed(y.breedId), y.colorId).hex).slice(1), 16);
      g.lineStyle(6, hex('o')).strokeEllipse(x, yy, 30, 10);
      g.lineStyle(4, col).strokeEllipse(x, yy, 30, 10);
      if (this.technique === 'kettle' && progress > 0.2) {
        g.fillStyle(parseInt(this.colorFor(y, Math.min(1, uptake * progress * 1.5)).slice(1), 16));
        g.fillRect(x - 10, yy - 5, 4, 3).fillRect(x + 6, yy + 2, 4, 3);
      }
    });
  }

  private drawFlames(): void {
    const g = this.flames;
    g.clear();
    if (this.step !== 'heat') return;
    const n = Math.round((this.temp - 20) / 10) + (this.heating ? 3 : 0);
    for (let i = 0; i < Math.min(9, n); i++) {
      const x = this.potX - 32 + i * 8;
      const h = 6 + Math.random() * (this.heating ? 10 : 5);
      g.fillStyle(hex(i % 2 ? 'y' : 'x')).fillRect(x, this.potY + 100 - h, 5, h);
    }
  }

  private steam(): void {
    if (this.temp < 60) return;
    const s = this.add.rectangle(this.potX + Phaser.Math.Between(-50, 50), this.potY - 40, 2, 2, hex('w')).setAlpha(0.8);
    this.tweens.add({ targets: s, y: s.y - 34, alpha: 0, duration: 1100, onComplete: () => s.destroy() });
    if (this.temp > 80 && Math.random() < 0.4) playSfx('dye_bubble');
  }

  /* ---------- results ---------- */

  private finishBath(): void {
    if (this.step === 'done') return;
    this.step = 'done';
    this.heating = false;
    this.ui.innerHTML = '';
    const uptake = this.uptake();
    const dos = this.dos();
    const existing = findColorway(game.state, dos, this.technique);
    const expected = this.colorFor(this.yarns[0], uptake);
    const clear = uptake >= 0.85;
    this.hint.set(clear ? 'The water is clear: the bath has exhausted.' : 'There’s still some dye in the water, so the skeins took less.');

    openModal(existing ? existing.name : 'A new colorway', (body, close) => {
      const sw = el('span', { className: 'swatch big' });
      sw.style.background = expected;
      body.append(
        el('div', { className: 'skein-head' }, [
          sw,
          el('div', {}, [
            el('strong', { textContent: `${this.yarns.length} skein${this.yarns.length > 1 ? 's' : ''}, one dye lot` }),
            el('small', {
              textContent: `DOS ${(dos.red + dos.yellow + dos.blue + dos.black).toFixed(2)}% · uptake ${Math.round(uptake * 100)}% · ${this.technique}${this.presoaked ? '' : ' · blotchy (no pre-soak)'}`,
            }),
          ]),
          el('span'),
        ]),
      );
      let nameInput: HTMLInputElement | null = null;
      if (!existing) {
        body.append(el('p', { className: 'hint', textContent: 'A new recipe for the swatch book. What will you call it?' }));
        let salt = 0;
        nameInput = el('input', { type: 'text', className: 'text-input', maxLength: 28, value: suggestColorwayName(expected) });
        nameInput.setAttribute('aria-label', 'Colorway name');
        const again = el('button', { className: 'btn', textContent: 'Suggest another' });
        again.addEventListener('click', () => (nameInput!.value = suggestColorwayName(expected, ++salt)));
        body.append(nameInput, el('div', { className: 'btn-row' }, [again]));
      } else {
        body.append(el('p', { className: 'hint', textContent: `Repeated from the swatch book. A new dye lot can vary very slightly from earlier lots.` }));
      }
      const error = el('p', { className: 'error hidden', textContent: 'Give the colorway a name first.' });
      const done = el('button', { className: 'btn primary', textContent: 'Rinse and hang to dry' });
      done.addEventListener('click', () => {
        const name = nameInput ? nameInput.value.trim() : existing!.name;
        if (!name) {
          error.classList.remove('hidden');
          return;
        }
        const out = dyeBatch(game.state, this.yarns.map((y) => y.id), { dos, technique: this.technique, uptake, presoaked: this.presoaked }, name);
        game.changed();
        void game.saveNow();
        playSfx('water_slosh');
        if (game.state.colorways.length >= 24) unlock('full_rainbow');
        close();
        toast(`${out.colorway.name}, lot ${out.lot}: ${out.yarns.map((y) => yarnName(y)).length} skein${out.yarns.length > 1 ? 's' : ''} drying on the rack.`, 3600);
        this.leave();
      });
      body.append(error, el('div', { className: 'btn-row' }, [done]));
    });
  }
}
