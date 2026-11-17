import { Grid, type PixelMap } from './grid';

/**
 * Furniture and room props. Each is drawn on an inner grid, then padded by a
 * pixel and given the same dark warm outline ('o') as the characters, so props
 * stand out from floors and walls.
 */
function outlined(w: number, h: number, draw: (g: Grid) => void, after?: (g: Grid) => void): PixelMap {
  const inner = new Grid(w - 2, h - 2);
  draw(inner);
  const g = new Grid(w, h).stamp(inner, 1, 1).outline('o');
  after?.(g);
  return g.rows();
}

/** Old castle-style spinning wheel: drive wheel, legs, treadle, flyer with a bobbin of yarn. */
export function spinningWheel(): PixelMap {
  return outlined(34, 34, (g) => {
    const cx = 11, cy = 11, r = 9.5;
    // legs and treadle
    g.line(6, 31, 9, 20, 'W').line(17, 31, 14, 20, 'W').line(26, 31, 26, 14, 'W');
    g.rect(4, 22, 25, 2, 'L');
    g.rect(7, 30, 12, 1, 'D');
    g.line(12, 13, 12, 29, 'D'); // footman
    // wheel: spokes, then rim
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      g.line(cx, cy, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 'L');
    }
    g.ring(cx, cy, r, 'W');
    g.ring(cx, cy, r - 1, 'L');
    g.rect(cx - 1, cy - 1, 3, 3, 'D'); // hub
    // drive band to the flyer
    g.line(cx + 1, cy - r, 24, 9, 'l');
    // flyer with a bobbin of mustard singles, and the orifice
    g.rect(22, 8, 8, 5, 'L');
    g.rect(23, 9, 5, 3, 'y');
    g.rect(30, 10, 2, 1, 'W');
  });
}

export function hayTrough(withHay = true): PixelMap {
  return outlined(42, 18, (g) => {
    g.rect(0, 6, 40, 8, 'W');
    g.rect(0, 6, 40, 1, withHay ? 'L' : 'D');
    g.rect(0, 13, 40, 1, 'D');
    for (let x = 5; x < 38; x += 8) g.rect(x, 7, 1, 6, 'D');
    if (withHay) {
      // hay heaped above the rim
      g.rect(1, 3, 38, 3, 'y');
      for (let x = 2; x < 38; x += 3) g.set(x, 2, 'y').set(x + 1, 4, 'L');
    }
    g.rect(2, 14, 2, 2, 'D').rect(36, 14, 2, 2, 'D');
  });
}

/** Slatted skirting table, so second cuts and VM fall through. */
export function skirtingTable(): PixelMap {
  return outlined(66, 30, (g) => {
    g.rect(0, 5, 64, 7, 'D');
    for (let x = 0; x < 64; x += 3) g.rect(x, 6, 2, 5, 'L');
    g.rect(0, 4, 64, 1, 'W');
    g.rect(0, 11, 64, 2, 'W');
    g.rect(2, 13, 3, 14, 'W').rect(59, 13, 3, 14, 'W');
    g.rect(5, 21, 54, 1, 'D');
  });
}

export function washTub(): PixelMap {
  return outlined(34, 20, (g) => {
    g.ellipse(16, 10, 15, 7.5, 'm');
    g.ellipse(16, 8, 14, 5, 'l');
    g.ellipse(16, 8, 12, 3.6, 'b');
    g.set(10, 7, 'w').set(11, 7, 'w').set(19, 9, 'w').set(22, 7, 'w');
    g.rect(2, 12, 28, 1, 'n');
  });
}

/** Stove with a steaming dye pot. Steam is drawn after the outline so it stays soft. */
export function dyeStove(): PixelMap {
  return outlined(
    38,
    36,
    (g) => {
      g.rect(3, 17, 30, 14, 'n');
      g.rect(1, 15, 34, 3, 'm');
      g.rect(9, 21, 18, 8, 'm');
      g.rect(12, 25, 12, 3, 'x');
      g.rect(14, 26, 8, 2, 'y');
      g.rect(4, 31, 3, 3, 'n').rect(29, 31, 3, 3, 'n');
      // pot
      g.rect(7, 5, 22, 10, 'g');
      g.rect(5, 4, 26, 2, 'l');
      g.rect(7, 4, 22, 1, 't'); // dye bath at the rim
      g.rect(3, 7, 2, 3, 'g').rect(31, 7, 2, 3, 'g');
      g.rect(8, 7, 2, 7, 'l');
    },
    (g) => {
      for (const [x, y] of [[13, 2], [14, 1], [21, 3], [22, 2], [18, 1]] as const) g.set(x, y, 'w');
    },
  );
}

/** Shelf with jars of 1% dye stock: red, yellow, blue and black. */
export function dyeShelf(): PixelMap {
  return outlined(66, 26, (g) => {
    g.rect(0, 17, 64, 3, 'W');
    g.rect(0, 17, 64, 1, 'L');
    g.rect(4, 20, 2, 4, 'D').rect(58, 20, 2, 4, 'D');
    ['x', 'y', 't', 'n'].forEach((c, i) => {
      const x = 4 + i * 15;
      g.rect(x, 4, 11, 13, 'w');
      g.rect(x + 1, 8, 9, 9, c);
      g.rect(x, 2, 11, 2, 'D');
      g.rect(x + 3, 10, 5, 3, 'f'); // label
      g.rect(x + 1, 5, 1, 3, 'f'); // glint
    });
  });
}

export function dryingRack(): PixelMap {
  return outlined(46, 52, (g) => {
    g.rect(2, 2, 3, 44, 'W').rect(39, 2, 3, 44, 'W');
    g.rect(2, 2, 40, 3, 'L');
    g.rect(0, 45, 8, 3, 'D').rect(36, 45, 8, 3, 'D');
    for (let x = 10; x < 38; x += 8) g.rect(x, 5, 1, 3, 'D');
  });
}

export function shopShelf(): PixelMap {
  return outlined(50, 16, (g) => {
    g.rect(0, 8, 48, 3, 'L');
    g.rect(0, 11, 48, 1, 'D');
    g.rect(4, 12, 2, 2, 'W').rect(42, 12, 2, 2, 'W');
  });
}

export function counter(): PixelMap {
  return outlined(102, 32, (g) => {
    g.rect(0, 0, 100, 5, 'L');
    g.rect(0, 4, 100, 1, 'W');
    g.rect(2, 5, 96, 22, 'W');
    for (let x = 12; x < 96; x += 14) g.rect(x, 7, 1, 18, 'D');
    g.rect(2, 7, 96, 1, 'D');
    g.rect(2, 27, 96, 3, 'D');
  });
}

export function knittingTable(): PixelMap {
  return outlined(58, 26, (g) => {
    g.rect(8, 12, 3, 12, 'W').rect(45, 12, 3, 12, 'W').rect(26, 14, 3, 10, 'W');
    g.ellipse(28, 9, 27, 7.5, 'D');
    g.ellipse(28, 7.5, 27, 7, 'L');
    g.ellipse(28, 7.5, 20, 4, 'W');
    g.ellipse(28, 7, 19, 3.5, 'L');
  });
}

export function cubby(): PixelMap {
  return outlined(36, 20, (g) => {
    g.rect(0, 0, 34, 18, 'D');
    g.rect(2, 2, 30, 14, 'W');
    g.rect(2, 2, 30, 1, 'D');
  });
}

export function pictureFrame(): PixelMap {
  return outlined(26, 26, (g) => {
    g.rect(0, 0, 24, 24, 'L');
    g.rect(2, 2, 20, 20, 'l');
    g.rect(3, 3, 18, 18, 'w');
    for (const [x, y] of [[0, 0], [23, 0], [0, 23], [23, 23]] as const) g.set(x, y, 'W');
  });
}

/** A lectern holding the open breed book. */
export function bookStand(): PixelMap {
  return outlined(30, 32, (g) => {
    g.rect(1, 2, 12, 10, 'w').rect(15, 2, 12, 10, 'w');
    g.rect(13, 1, 2, 12, 'v');
    for (let y = 4; y < 11; y += 2) g.rect(3, y, 8, 1, 'l').rect(17, y, 8, 1, 'l');
    g.rect(0, 12, 28, 3, 'W');
    g.rect(12, 15, 4, 12, 'W');
    g.rect(6, 27, 16, 3, 'D');
  });
}

/** A woven basket with one ball of teal yarn, waiting for company. */
export function yarnBasket(): PixelMap {
  return outlined(30, 22, (g) => {
    g.ellipse(14, 7, 6, 6, 't');
    g.line(10, 3, 16, 12, 'b').line(12, 2, 19, 10, 'b').line(18, 3, 10, 12, 'B');
    g.rect(0, 9, 28, 11, 'L');
    for (let y = 11; y < 20; y++) for (let x = (y % 2); x < 28; x += 2) g.set(x, y, 'W');
    g.rect(0, 9, 28, 2, 'W');
  });
}
