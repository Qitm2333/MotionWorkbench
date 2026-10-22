(() => {
const families = [
  {
    id: "brand-design", label: "Logo", count: 24,
    entries: [
      ["clever", "Clever", 1.5, "#75a5ff"], ["corners", "Corners", 1.15, "#f05e45"],
      ["momentous", "Momentous", 1.78, "#171717"], ["tolan", "Tolan", .92, "#a990e8"],
      ["afina", "Afina", 1.32, "#dba83b"], ["format", "Format", 1.68, "#5f665d"],
      ["usual", "Usual", 1.2, "#244f92"], ["americana", "Americana", 1.74, "#e64b31"],
      ["petal", "Petal", .78, "#8553c7"], ["offhours", "Offhours", 1.92, "#176c83"],
      ["highnote", "Highnote", 1.42, "#c68f31"], ["antioch", "Antioch", 1.05, "#637363"]
    ]
  },
  {
    id: "product-design", label: "Digital", count: 60,
    entries: [
      ["archiv", "Archiv", 1.72, "#171717"], ["cashscore", "CashScore", 1.1, "#3f8cbc"],
      ["oasis", "Oasis", 1.44, "#8f8668"], ["universe", "Universe", .86, "#7546bb"],
      ["stratus", "Stratus", 1.9, "#225b96"], ["hedroom", "Hedroom", 1.25, "#e24c38"],
      ["groth", "Groth", 1.62, "#7e8179"], ["feast-app", "Feast", 1.02, "#cba23e"],
      ["usual-app", "Usual", 1.77, "#292929"], ["tolan-app", "Tolan", 1.2, "#569caf"],
      ["petal-app", "Petal", .75, "#a077cc"], ["format-app", "Format", 1.48, "#76715e"],
      ["atlas", "Atlas", 1.95, "#3c6d61"], ["rivet", "Rivet", 1.12, "#bd6746"]
    ]
  },
  {
    id: "physical-design", label: "Physical", count: 22,
    entries: [
      ["feast", "Feast", 1.58, "#a79b78"], ["cpgd", "CPGD", 1.08, "#d44a3c"],
      ["groth-object", "Groth", 1.82, "#626658"], ["offhours-object", "Offhours", 1.2, "#286b83"],
      ["americana-print", "Americana", 1.5, "#c99231"], ["momentous-object", "Momentous", .82, "#222"],
      ["corners-print", "Corners", 1.7, "#835eb2"], ["clever-object", "Clever", 1.04, "#548fb5"],
      ["antioch-print", "Antioch", 1.36, "#657664"], ["field", "Field", 1.92, "#8c5745"]
    ]
  }
].map((family) => ({
  ...family,
  entries: family.entries.map(([id, title, aspectRatio, color]) => ({ id, title, aspectRatio, color }))
}));

const familyById = new Map(families.map((family) => [family.id, family]));
const total = families.reduce((sum, family) => sum + family.count, 0);
const app = document.querySelector(".app");
const stage = document.querySelector("#catalogStage");
const world = document.querySelector("#nodeWorld");
const linksLayer = document.querySelector("#nodeLinks");
const pillLayer = document.querySelector("#pillLayer");
const cardLayer = document.querySelector("#cardLayer");
const gridView = document.querySelector("#gridView");
const status = document.querySelector("#catalogStatus");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobile = window.matchMedia("(max-width: 900px)");
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const motionParameterDefaults = {
  cardCount: 14,
  expansionSpread: 1,
  turbulence: 1,
  entryStiffness: 64,
  entryDamping: 15
};
const motionParams = window.workbench?.params?.define
  ? window.workbench.params.define({
      cardCount: { type: "number", label: "Visible cards", default: 14, min: 4, max: 14, step: 1, group: "Expansion" },
      expansionSpread: { type: "number", label: "Expansion spread", default: 1, min: .6, max: 1.5, step: .05, group: "Expansion" },
      turbulence: { type: "number", label: "Turbulence", default: 1, min: 0, max: 2, step: .05, group: "Motion" },
      entryStiffness: { type: "number", label: "Entry stiffness", default: 64, min: 24, max: 180, step: 1, group: "Motion" },
      entryDamping: { type: "number", label: "Entry damping", default: 15, min: 6, max: 32, step: 1, group: "Motion" }
    })
  : { ...motionParameterDefaults };

const urlFamily = new URLSearchParams(location.search).get("family");
let activeFamily = familyById.has(urlFamily) ? urlFamily : families[0].id;
let currentLayout = null;
let cardStates = new Map();
let hoverKey = null;
let view = mobile.matches ? "grid" : "tree";
let camera = { x: 0, y: 0, panX: 0, panY: 0 };
let firstLayout = true;
let lastFrame = performance.now();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seededRandom(seed) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x1000193);
  }
  return () => {
    let value = Math.imul((hash = (hash + 0x6d2b79f5) | 0) ^ (hash >>> 15), 1 | hash);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function bounds(items) {
  const valid = items.filter(Boolean);
  if (!valid.length) return null;
  return {
    minX: Math.min(...valid.map((item) => item.minX)),
    maxX: Math.max(...valid.map((item) => item.maxX)),
    minY: Math.min(...valid.map((item) => item.minY)),
    maxY: Math.max(...valid.map((item) => item.maxY))
  };
}

function pillBounds(pills, height) {
  if (!pills.length) return null;
  return {
    minX: Math.min(...pills.map((pill) => pill.x)),
    maxX: Math.max(...pills.map((pill) => pill.x + pill.width)),
    minY: Math.min(...pills.map((pill) => pill.y)) - height / 2,
    maxY: Math.max(...pills.map((pill) => pill.y)) + height / 2
  };
}

function pillWidth(label, count) {
  const canvas = pillWidth.canvas || (pillWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = '14px "Helvetica Neue", Helvetica, Arial, sans-serif';
  return Math.ceil(context.measureText(label).width + context.measureText(String(count)).width + 38);
}

function metrics() {
  const rect = stage.getBoundingClientRect();
  const unit = Math.max(1, rect.width / 1900);
  return {
    unit,
    compact: rect.width <= 900,
    size: { width: rect.width, height: rect.height },
    insets: { top: 74, right: 46, bottom: 72, left: 56 },
    widths: new Map([
      ["root", pillWidth("Catalog", total)],
      ...families.map((family) => [`family:${family.id}`, pillWidth(family.label, family.count)])
    ])
  };
}

function workLayout({ family, familyPill, familyX, familyColumn, routeBottom, metrics: measure }) {
  const { unit, compact, size, insets } = measure;
  const flow = compact ? "down" : "right";
  const availableWidth = size.width - insets.left - insets.right;
  const availableHeight = size.height - insets.top - insets.bottom;
  const origin = { x: familyX + familyPill.width, y: familyPill.y };
  const area = flow === "down"
    ? { minX: 0, maxX: availableWidth, minY: routeBottom + 72 * unit, maxY: routeBottom + 72 * unit + .92 * availableHeight }
    : (() => {
        const minX = familyX + familyColumn + 96 * unit;
        const width = Math.max(260 * unit, availableWidth - minX);
        return { minX, maxX: minX + width, minY: familyPill.y - availableHeight / 2 - 12 * unit, maxY: familyPill.y + availableHeight / 2 + 12 * unit };
      })();

  const expansionSpread = clamp(Number(motionParams.expansionSpread) || motionParameterDefaults.expansionSpread, .6, 1.5);
  if (flow === "right") {
    area.maxX = area.minX + (area.maxX - area.minX) * expansionSpread;
  } else {
    const centerX = (area.minX + area.maxX) / 2;
    const width = (area.maxX - area.minX) * expansionSpread;
    area.minX = centerX - width / 2;
    area.maxX = centerX + width / 2;
    area.maxY = area.minY + (area.maxY - area.minY) * expansionSpread;
  }

  const cardCount = clamp(Math.round(Number(motionParams.cardCount) || motionParameterDefaults.cardCount), 1, family.entries.length);
  const turbulence = clamp(Number(motionParams.turbulence) || 0, 0, 2);
  const prepared = family.entries.slice(0, cardCount).map((entry) => {
    const random = seededRandom(entry.id);
    const aspect = clamp(entry.aspectRatio || 1.68, .6, 2.2);
    const scale = .68 + .7 * Math.pow(random(), 1.7);
    const driftScale = .75 + .5 * (scale - .68) / .7;
    return {
      entry, aspect, scale,
      jitterX: (random() - .5) * .1,
      jitterY: (random() - .5) * .1,
      lift: (random() - .5) * 6 * unit,
      bend: .34 + .3 * random(),
      ink: .55 + .45 * random(),
      drift: {
        ax: (2.5 + 3.5 * random()) * unit * driftScale * turbulence,
        ay: (3.5 + 5 * random()) * unit * driftScale * turbulence,
        tx: 7 + 7 * random(), ty: 8 + 8 * random(), px: random() * TAU, py: random() * TAU
      }
    };
  });

  const density = compact ? .5 : .4;
  const areaWidth = area.maxX - area.minX;
  let areaHeight = area.maxY - area.minY;
  const weight = prepared.reduce((sum, item) => sum + item.scale * item.scale / item.aspect, 0);
  const base = clamp(Math.sqrt(density * areaWidth * areaHeight / weight), (compact ? 104 : 92) * unit, (compact ? 168 : 214) * unit);
  const requiredArea = weight * base * base / density;
  if (requiredArea > areaWidth * areaHeight) {
    const extra = requiredArea / areaWidth - areaHeight;
    if (flow === "right") {
      area.minY -= extra / 2;
      area.maxY += extra / 2;
    } else {
      area.maxY += extra;
    }
    areaHeight = area.maxY - area.minY;
  }

  const exclusion = { x: origin.x, y: origin.y, rx: area.minX - origin.x + .2 * areaWidth, ry: .15 * availableHeight };
  const makePositions = (shrink) => {
    if (flow === "down") {
      return prepared.map((item, index) => {
        const radial = .24 + .76 * Math.sqrt((index + .5) / prepared.length);
        const spread = Math.PI / 180 * 150;
        const angle = (index * GOLDEN_ANGLE % spread + spread) % spread - spread / 2;
        const width = base * item.scale * shrink;
        const height = width / item.aspect;
        const x = (area.minX + area.maxX) / 2 + (radial * Math.sin(angle) + item.jitterX) * (areaWidth / 2);
        const y = area.minY + (radial * Math.cos(angle) + item.jitterY) * areaHeight;
        return { x, y, w: width, h: height, hx: x, hy: y };
      });
    }

    const sizes = prepared.map((item) => {
      const width = base * item.scale * shrink;
      return { w: width, h: width / item.aspect };
    });
    const random = seededRandom(`${family.id}:${prepared.length}`);
    const positions = Array(sizes.length);
    const placed = [];
    sizes.map((_, index) => index).sort((a, b) => sizes[b].w * sizes[b].h - sizes[a].w * sizes[a].h).forEach((index) => {
      const { w, h } = sizes[index];
      let best = { x: (area.minX + area.maxX) / 2, y: (area.minY + area.maxY) / 2, room: -Infinity };
      for (let attempt = 0; attempt < 24 + 4 * placed.length; attempt += 1) {
        const x = area.minX + w / 2 + random() * Math.max(0, area.maxX - area.minX - w);
        const y = area.minY + h / 2 + random() * Math.max(0, area.maxY - area.minY - h);
        let room = 2 * Math.min(x - w / 2 - area.minX, area.maxX - x - w / 2, y - h / 2 - area.minY, area.maxY - y - h / 2);
        placed.forEach((other) => {
          room = Math.min(room, Math.max(Math.abs(x - other.x) - (w + other.w) / 2, Math.abs(y - other.y) - (h + other.h) / 2));
        });
        const nx = (clamp(exclusion.x, x - w / 2, x + w / 2) - exclusion.x) / exclusion.rx;
        const ny = (clamp(exclusion.y, y - h / 2, y + h / 2) - exclusion.y) / exclusion.ry;
        const outside = 1 - (nx * nx + ny * ny);
        if (outside > 0) room -= 1e6 * outside;
        if (room > best.room) best = { x, y, room };
      }
      const position = { x: best.x, y: best.y, w, h, hx: best.x, hy: best.y };
      positions[index] = position;
      placed.push(position);
    });
    return positions;
  };

  const gap = 14 * unit;
  let positions = [];
  for (let pass = 0; pass < 6; pass += 1) {
    positions = makePositions(Math.pow(.94, pass));
    for (let iteration = 0; iteration < 220; iteration += 1) {
      for (let a = 0; a < positions.length; a += 1) {
        for (let b = a + 1; b < positions.length; b += 1) {
          const first = positions[a];
          const second = positions[b];
          const dx = second.x - first.x;
          const dy = second.y - first.y;
          const overlapX = (first.w + second.w) / 2 + gap - Math.abs(dx);
          const overlapY = (first.h + second.h) / 2 + gap - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;
          const firstArea = first.w * first.h;
          const secondArea = second.w * second.h;
          const firstShare = secondArea / (firstArea + secondArea);
          const secondShare = firstArea / (firstArea + secondArea);
          if (overlapX < overlapY) {
            const sign = Math.sign(dx) || (b % 2 ? 1 : -1);
            first.x -= sign * overlapX * firstShare;
            second.x += sign * overlapX * secondShare;
          } else {
            const sign = Math.sign(dy) || (b % 2 ? 1 : -1);
            first.y -= sign * overlapY * firstShare;
            second.y += sign * overlapY * secondShare;
          }
        }
      }
      const returnRate = iteration < 154 ? .02 : .004;
      positions.forEach((position) => {
        position.x += (position.hx - position.x) * returnRate;
        position.y += (position.hy - position.y) * returnRate;
        position.x = clamp(position.x, area.minX + position.w / 2, area.maxX - position.w / 2);
        position.y = clamp(position.y, area.minY + position.h / 2, area.maxY - position.h / 2);
      });
    }
    const clear = positions.every((first, index) => positions.slice(index + 1).every((second) => {
      const tolerance = .4 * gap;
      return !(Math.abs(first.x - second.x) < (first.w + second.w) / 2 + tolerance && Math.abs(first.y - second.y) < (first.h + second.h) / 2 + tolerance);
    }));
    if (clear) break;
  }

  const order = new Map(positions.map((position, index) => ({ index, distance: Math.hypot(position.x - origin.x, position.y - origin.y) }))
    .sort((a, b) => a.distance - b.distance).map((item, index) => [item.index, index]));
  const cards = prepared.map((item, index) => {
    const position = positions[index];
    return {
      key: `card:${item.entry.id}`, entry: item.entry, x: position.x, y: position.y,
      width: position.w, height: position.h, order: order.get(index) ?? index,
      origin: { x: origin.x, y: origin.y + item.lift }, flow, bend: item.bend, ink: item.ink, drift: item.drift
    };
  });
  const cardBox = bounds(cards.map((card) => ({
    minX: card.x - card.width / 2 - 10 * unit, maxX: card.x + card.width / 2 + 10 * unit,
    minY: card.y - card.height / 2 - 10 * unit, maxY: card.y + card.height / 2 + 26 * unit
  })));
  return { cards, box: bounds([cardBox, { minX: origin.x, maxX: origin.x, minY: origin.y, maxY: origin.y }]) };
}

function buildLayout(path, measure) {
  const { unit, compact, size, insets, widths } = measure;
  const height = 35 * unit;
  const columnGap = (compact ? 28 : 72) * unit;
  const rowGap = 58 * unit;
  const width = (key) => widths.get(key) ?? 96 * unit;
  const selected = path ? familyById.get(path) : null;
  const rootWidth = width("root");
  const widestFamily = Math.max(...families.map((family) => width(`family:${family.id}`)));
  const availableWidth = size.width - insets.left - insets.right;
  const selectedReserve = selected && !compact ? 320 * unit : 0;
  const collapseFamilies = Boolean(selected) && rootWidth + columnGap + widestFamily + selectedReserve > availableWidth;
  const shownFamilies = collapseFamilies && selected ? [selected] : families;
  const pills = [{ key: "root", label: "Catalog", count: total, x: 0, y: 0, width: rootWidth, state: path ? "path" : "current", order: 0, target: null }];
  const links = [];
  const familyX = rootWidth + columnGap;
  const familyColumn = collapseFamilies && selected ? width(`family:${selected.id}`) : widestFamily;
  const familyPills = shownFamilies.map((family, index) => {
    const current = family.id === path;
    const y = (index - (shownFamilies.length - 1) / 2) * rowGap;
    links.push({
      key: `link:family:${family.id}`,
      d: `M ${rootWidth} 0 C ${rootWidth + (familyX - rootWidth) * .5} 0, ${familyX - (familyX - rootWidth) * .5} ${y}, ${familyX} ${y}`,
      state: current ? "path" : path ? "dim" : "idle", delay: .05 * index
    });
    return {
      key: `family:${family.id}`, familyId: family.id, label: family.label, count: family.count,
      x: familyX, y, width: width(`family:${family.id}`), state: current ? "current" : path ? "dim" : "idle",
      order: index, target: current ? null : family.id
    };
  });
  pills.push(...familyPills);
  const selectedPill = selected ? familyPills.find((pill) => pill.familyId === selected.id) : null;
  let cards = [];
  let workBox = null;
  if (selected && selectedPill) {
    const work = workLayout({
      family: selected, familyPill: selectedPill, familyX, familyColumn,
      routeBottom: Math.max(...pills.map((pill) => pill.y)) + height / 2, metrics: measure
    });
    cards = work.cards;
    workBox = work.box;
  }
  return {
    pills, links, cards, familyPill: selectedPill,
    boxes: { root: pillBounds([pills[0]], height), families: pillBounds(familyPills, height), work: workBox }
  };
}

function cameraFor(layout, path, measure) {
  const { size, insets, compact } = measure;
  const availableWidth = size.width - insets.left - insets.right;
  const availableHeight = size.height - insets.top - insets.bottom;
  const all = bounds([layout.boxes.root, layout.boxes.families, layout.boxes.work]);
  const focus = path ? bounds([layout.boxes.families, layout.boxes.work]) : bounds([layout.boxes.root, layout.boxes.families]);
  const contentWidth = all.maxX - all.minX;
  const focusHeight = focus.maxY - focus.minY;
  const x = contentWidth <= availableWidth ? insets.left + (availableWidth - contentWidth) / 2 - all.minX : insets.left - all.minX;
  let y = focusHeight <= availableHeight ? insets.top + (availableHeight - focusHeight) / 2 - focus.minY : insets.top - focus.minY;
  if (path && layout.familyPill && !compact) y = insets.top + availableHeight / 2 - layout.familyPill.y;
  return { x, y };
}

function renderPills(layout, unit) {
  const alive = new Set();
  layout.pills.forEach((pill) => {
    alive.add(pill.key);
    let element = pillLayer.querySelector(`[data-key="${pill.key}"]`);
    const isNew = !element;
    if (!element) {
      element = document.createElement("button");
      element.type = "button";
      element.className = "node-anchor";
      element.dataset.key = pill.key;
      element.id = `archive-node-${pill.key.replace(":", "-")}`;
      element.innerHTML = `<span></span><small></small>`;
      element.style.opacity = "0";
      pillLayer.append(element);
      element.addEventListener("click", () => navigate(element.dataset.target || null));
    }
    element.querySelector("span").textContent = pill.label;
    element.querySelector("small").textContent = pill.count;
    element.dataset.target = pill.target || "";
    element.className = `node-anchor node-anchor--${pill.state}`;
    element.setAttribute("aria-expanded", String(pill.state === "current" || pill.state === "path"));
    if (pill.state === "current") element.setAttribute("aria-current", "true");
    else element.removeAttribute("aria-current");
    if (isNew && !reducedMotion.matches) {
      element.style.transform = `translate3d(${pill.x - 14 * unit}px, ${pill.y}px, 0)`;
      element.style.transitionDelay = `${.16 + .05 * pill.order}s`;
      requestAnimationFrame(() => {
        element.style.opacity = "1";
        element.style.transform = `translate3d(${pill.x}px, ${pill.y}px, 0)`;
      });
    } else {
      element.style.opacity = "1";
      element.style.transform = `translate3d(${pill.x}px, ${pill.y}px, 0)`;
    }
  });
  pillLayer.querySelectorAll(".node-anchor").forEach((element) => {
    if (!alive.has(element.dataset.key)) element.remove();
  });
}

function renderBranchLinks(layout) {
  linksLayer.querySelectorAll(".node-link--branch").forEach((path) => path.remove());
  layout.links.forEach((link) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", link.d);
    path.setAttribute("pathLength", "1");
    path.classList.add("node-link", "node-link--branch", `node-link--${link.state}`);
    if (!reducedMotion.matches) path.classList.add("is-new");
    path.style.setProperty("--delay", `${link.delay}s`);
    linksLayer.prepend(path);
  });
}

function createCardState(card, now) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.classList.add("node-link", "node-link--bloom");
  path.style.setProperty("--ink", card.ink);
  linksLayer.append(path);
  const element = document.createElement("button");
  element.type = "button";
  element.className = "project-card";
  element.dataset.key = card.key;
  element.setAttribute("aria-label", card.entry.title);
  element.style.width = `${card.width}px`;
  element.style.height = `${card.height}px`;
  element.style.setProperty("--card-bg", card.entry.color);
  element.style.setProperty("--card-fg", card.entry.color === "#171717" || card.entry.color === "#222" ? "#fff" : "#fff");
  element.innerHTML = `<span>${card.entry.title}</span>`;
  cardLayer.append(element);
  const state = {
    ...card, element, path, mode: reducedMotion.matches ? "active" : "entering",
    p: reducedMotion.matches ? 1 : 0, pVelocity: 0,
    delayUntil: now + 1000 * (.26 + .024 * Math.min(card.order, 40)),
    dx: 0, dy: 0, grow: 1, dxVelocity: 0, dyVelocity: 0, growVelocity: 0,
    targetDx: 0, targetDy: 0, targetGrow: 1
  };
  element.addEventListener("pointerenter", () => setHover(card.key));
  element.addEventListener("pointerleave", () => setHover(null));
  return state;
}

function reconcileCards(cards) {
  const now = performance.now();
  const nextKeys = new Set(cards.map((card) => card.key));
  cardStates.forEach((state, key) => {
    if (!nextKeys.has(key) && state.mode !== "exiting") {
      state.mode = "exiting";
      state.exitStart = now;
      state.exitFrom = state.p;
      state.element.classList.remove("is-hot");
    }
  });
  cards.forEach((card) => {
    const existing = cardStates.get(card.key);
    if (existing && existing.mode !== "exiting") {
      Object.assign(existing, card);
      existing.element.style.width = `${card.width}px`;
      existing.element.style.height = `${card.height}px`;
      return;
    }
    if (existing) {
      existing.element.remove();
      existing.path.remove();
    }
    cardStates.set(card.key, createCardState(card, now));
  });
  setHover(null);
}

function renderGrid() {
  const source = activeFamily ? familyById.get(activeFamily).entries : families.flatMap((family) => family.entries);
  gridView.innerHTML = source.map((entry) => `<button class="grid-card" type="button" style="--card-bg:${entry.color}" aria-label="${entry.title}"><span>${entry.title}</span></button>`).join("");
}

function setWorldTransform(animate = true) {
  world.style.transition = animate && !reducedMotion.matches ? "transform 1.05s cubic-bezier(.22,1,.36,1)" : "none";
  world.style.transform = `translate3d(${camera.x + camera.panX}px, ${camera.y + camera.panY}px, 0)`;
}

function updateScene({ animateCamera = true } = {}) {
  const measure = metrics();
  currentLayout = buildLayout(activeFamily, measure);
  renderPills(currentLayout, measure.unit);
  renderBranchLinks(currentLayout);
  reconcileCards(currentLayout.cards);
  renderGrid();
  const target = cameraFor(currentLayout, activeFamily, measure);
  camera.x = target.x;
  camera.y = target.y;
  camera.panX = 0;
  camera.panY = 0;
  setWorldTransform(animateCamera && !firstLayout);
  firstLayout = false;
  const family = activeFamily ? familyById.get(activeFamily) : null;
  status.textContent = family ? `${family.label}. ${family.count} works.` : `Catalog. ${total} works across ${families.length} types of work.`;
}

let layoutParameterKey = `${motionParams.cardCount}:${motionParams.expansionSpread}:${motionParams.turbulence}`;
document.addEventListener("workbench:params", () => {
  const nextLayoutParameterKey = `${motionParams.cardCount}:${motionParams.expansionSpread}:${motionParams.turbulence}`;
  if (nextLayoutParameterKey === layoutParameterKey) return;
  layoutParameterKey = nextLayoutParameterKey;
  updateScene({ animateCamera: false });
});

function syncUrl() {
  // Local file origins can reject History API changes; navigation still works in memory.
  if (location.protocol === "file:") return;
  const url = new URL(location.href);
  if (activeFamily) url.searchParams.set("family", activeFamily);
  else url.searchParams.delete("family");
  history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function navigate(target) {
  const next = target === activeFamily ? null : target;
  if (next === activeFamily) return;
  activeFamily = next;
  hoverKey = null;
  syncUrl();
  updateScene();
}

function cardPath(card, x, y, scale) {
  const start = card.origin;
  const endX = x - card.width / 2 * scale;
  const distance = Math.max(24, endX - start.x);
  return `M ${start.x} ${start.y} C ${start.x + distance * card.bend} ${start.y}, ${endX - distance * (1 - card.bend) * .85} ${y}, ${endX} ${y}`;
}

function spring(state, valueKey, velocityKey, target, stiffness, damping, mass, delta) {
  const displacement = state[valueKey] - target;
  const acceleration = (-stiffness * displacement - damping * state[velocityKey]) / mass;
  state[velocityKey] += acceleration * delta;
  state[valueKey] += state[velocityKey] * delta;
}

function bezierEase(value) {
  const x1 = .22, y1 = 1, x2 = .36, y2 = 1;
  let t = value;
  for (let index = 0; index < 5; index += 1) {
    const inv = 1 - t;
    const x = 3 * inv * inv * t * x1 + 3 * inv * t * t * x2 + t * t * t;
    const derivative = 3 * inv * inv * x1 + 6 * inv * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(derivative) > 1e-5) t -= (x - value) / derivative;
  }
  const inv = 1 - t;
  return 3 * inv * inv * t * y1 + 3 * inv * t * t * y2 + t * t * t;
}

function setHover(key) {
  hoverKey = key;
  const active = [...cardStates.values()].filter((state) => state.mode !== "exiting" && state.p > .2);
  active.forEach((state) => {
    state.targetDx = 0;
    state.targetDy = 0;
    state.targetGrow = state.key === key ? Math.max(1.12, 196 * metrics().unit / state.width) : 1;
    state.element.classList.toggle("is-hot", state.key === key);
  });
  if (!key) return;
  const held = active.find((state) => state.key === key);
  if (!held) return;
  const unit = metrics().unit;
  const padding = 12 * unit;
  const lift = 30 * unit;
  const bodies = active.map((state) => {
    const isHeld = state === held;
    const scale = isHeld ? state.targetGrow : 1;
    return {
      state, held: isHeld, x: state.x, y: state.y + (isHeld ? lift / 2 : 0),
      restX: state.x, restY: state.y + (isHeld ? lift / 2 : 0),
      w: state.width * scale, h: state.height * scale + (isHeld ? lift : 0),
      swayX: state.drift.ax, swayY: state.drift.ay, mass: state.width * state.height
    };
  });
  const separate = (first, second, strength) => {
    const protectedPair = first.held || second.held;
    const needX = (first.w + second.w) / 2 + padding + (protectedPair ? first.swayX + second.swayX : 0);
    const needY = (first.h + second.h) / 2 + padding + (protectedPair ? first.swayY + second.swayY : 0);
    let dx = second.x - first.x;
    let dy = second.y - first.y;
    if (Math.abs(dx) >= needX || Math.abs(dy) >= needY) return;
    if (Math.abs(dx) < .01 && Math.abs(dy) < .01) { dx = 1; dy = .5; }
    const distance = Math.hypot(dx, dy);
    const nx = dx / distance;
    const ny = dy / distance;
    const push = Math.min(Math.abs(nx) > .001 ? (needX - Math.abs(dx)) / Math.abs(nx) : Infinity, Math.abs(ny) > .001 ? (needY - Math.abs(dy)) / Math.abs(ny) : Infinity) * strength;
    const firstShare = first.held ? 0 : second.held ? 1 : second.mass / (first.mass + second.mass);
    const secondShare = 1 - firstShare;
    first.x -= nx * push * firstShare;
    first.y -= ny * push * firstShare;
    second.x += nx * push * secondShare;
    second.y += ny * push * secondShare;
  };
  const solve = (strength, heldOnly = false) => {
    for (let a = 0; a < bodies.length; a += 1) {
      for (let b = a + 1; b < bodies.length; b += 1) {
        if (!heldOnly || bodies[a].held || bodies[b].held) separate(bodies[a], bodies[b], strength);
      }
    }
  };
  for (let index = 0; index < 70; index += 1) {
    solve(.5);
    if (index < 45) bodies.forEach((body) => {
      if (!body.held) { body.x += (body.restX - body.x) * .04; body.y += (body.restY - body.y) * .04; }
    });
  }
  for (let index = 0; index < 8; index += 1) solve(1, true);
  bodies.forEach((body) => {
    body.state.targetDx = body.x - body.restX;
    body.state.targetDy = body.y - body.restY;
  });
}

function animate(now) {
  const delta = Math.min(.032, Math.max(.001, (now - lastFrame) / 1000));
  lastFrame = now;
  const entryStiffness = clamp(Number(motionParams.entryStiffness) || motionParameterDefaults.entryStiffness, 24, 180);
  const entryDamping = clamp(Number(motionParams.entryDamping) || motionParameterDefaults.entryDamping, 6, 32);
  for (const [key, state] of cardStates) {
    if (state.mode === "entering" && now >= state.delayUntil) {
      spring(state, "p", "pVelocity", 1, entryStiffness, entryDamping, 1, delta);
      if (Math.abs(state.p - 1) < .001 && Math.abs(state.pVelocity) < .01) { state.p = 1; state.mode = "active"; }
    } else if (state.mode === "exiting") {
      const elapsed = clamp((now - state.exitStart) / 420, 0, 1);
      state.p = state.exitFrom * (1 - bezierEase(elapsed));
      if (elapsed >= 1) {
        state.element.remove();
        state.path.remove();
        cardStates.delete(key);
        continue;
      }
    }

    const mass = .6 + Math.min(.7, state.width * state.height / (24000 * metrics().unit * metrics().unit));
    const movingOut = Math.hypot(state.targetDx, state.targetDy) >= Math.hypot(state.dx, state.dy);
    spring(state, "dx", "dxVelocity", state.targetDx, movingOut ? 230 : 110, movingOut ? 22 : 17, mass, delta);
    spring(state, "dy", "dyVelocity", state.targetDy, movingOut ? 230 : 110, movingOut ? 22 : 17, mass, delta);
    const growing = state.targetGrow >= state.grow;
    spring(state, "grow", "growVelocity", state.targetGrow, growing ? 170 : 300, growing ? 21 : 26, 1, delta);

    const driftX = state.drift.ax * Math.sin(now / 1000 / state.drift.tx * TAU + state.drift.px);
    const driftY = state.drift.ay * Math.sin(now / 1000 / state.drift.ty * TAU + state.drift.py);
    const x = state.origin.x + (state.x + driftX + state.dx - state.origin.x) * state.p;
    const y = state.origin.y + (state.y + driftY + state.dy - state.origin.y) * state.p;
    const scale = (.38 + .62 * state.p) * state.grow;
    const opacity = clamp(1.6 * state.p, 0, 1);
    state.element.style.opacity = opacity;
    state.element.style.transform = `translate3d(${x - state.width / 2}px, ${y - state.height / 2}px, 0) scale(${scale})`;
    state.path.style.opacity = opacity;
    state.path.setAttribute("d", cardPath(state, x, y, scale));
  }
  requestAnimationFrame(animate);
}

document.addEventListener("keydown", (event) => {
  if ((event.key === "Escape" || event.key === "Backspace") && activeFamily && !event.target.closest("input, textarea, select")) {
    event.preventDefault();
    navigate(null);
  }
});

document.querySelector("#gridToggle").addEventListener("click", () => {
  view = view === "tree" ? "grid" : "tree";
  app.dataset.layout = view;
});
document.querySelector("#soundToggle").addEventListener("click", (event) => {
  event.currentTarget.classList.toggle("is-muted");
  event.currentTarget.textContent = event.currentTarget.classList.contains("is-muted") ? "×" : "◌";
});

let pointer = null;
let suppressClick = false;
stage.addEventListener("wheel", (event) => {
  if (view !== "tree" || mobile.matches || event.ctrlKey || event.target.closest("[data-own-scroll]")) return;
  event.preventDefault();
  camera.panX -= event.deltaX;
  camera.panY -= event.deltaY;
  setWorldTransform(false);
}, { passive: false });
stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest("button, input, textarea, select")) return;
  pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
});
stage.addEventListener("pointermove", (event) => {
  if (!pointer || pointer.id !== event.pointerId) return;
  if (!pointer.moved) {
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 6) return;
    pointer.moved = true;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-panning");
  }
  camera.panX += event.clientX - pointer.lastX;
  camera.panY += event.clientY - pointer.lastY;
  pointer.lastX = event.clientX;
  pointer.lastY = event.clientY;
  setWorldTransform(false);
});
function endPointer(event) {
  if (!pointer || pointer.id !== event.pointerId) return;
  suppressClick = pointer.moved;
  pointer = null;
  stage.classList.remove("is-panning");
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  setTimeout(() => { suppressClick = false; }, 0);
}
stage.addEventListener("pointerup", endPointer);
stage.addEventListener("pointercancel", endPointer);
stage.addEventListener("click", (event) => {
  if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
}, true);

let resizeFrame = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    view = mobile.matches ? "grid" : view;
    app.dataset.layout = view;
    updateScene({ animateCamera: false });
  });
});
mobile.addEventListener("change", () => {
  if (mobile.matches) view = "grid";
  app.dataset.layout = view;
});

app.dataset.layout = view;
updateScene({ animateCamera: false });
requestAnimationFrame(animate);
})();
