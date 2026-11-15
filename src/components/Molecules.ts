import randomColor from 'randomcolor';
import { random, range, sample } from '../tools/math';

class Molecule {
  id: number;
  container: string;
  size: number;
  color: string;
  x: number;
  y: number;
  speed: { x: number; y: number };
  baseOpacity: number;
  phaseOffset: number;
  el: HTMLDivElement | null = null;

  constructor({ container }: { container: string }) {
    this.id = random(1000, 9999);
    this.container = container;
    this.size = sample([random(5, 10), random(10, 50)]) || 20;
    this.color = randomColor();
    this.x = random(0, typeof window !== 'undefined' ? window.innerWidth : 1024);
    this.y = random(0, typeof window !== 'undefined' ? window.innerHeight : 768);
    this.speed = {
      x: (random(-20, 20) * this.size) / 1000,
      y: (random(-20, 20) * this.size) / 1000
    };
    this.baseOpacity = Math.max(random(50, 1000) / this.size ** 2, 0.2) || 0.5;
    this.phaseOffset = Math.random() * Math.PI * 2;
  }

  getTemplate(): HTMLDivElement {
    const elm = document.createElement('div');
    elm.classList.add('Molecule');
    elm.id = String(this.id);
    return elm;
  }

  create(): this {
    const containerElm = document.querySelector(this.container);
    if (!containerElm) return this;
    const newMolecule = this.getTemplate();
    newMolecule.style.width = `${this.size}px`;
    newMolecule.style.height = `${this.size}px`;
    newMolecule.style.background = this.color;
    newMolecule.style.opacity = String(this.baseOpacity);
    newMolecule.style.left = '0px';
    newMolecule.style.top = '0px';
    newMolecule.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    newMolecule.style.willChange = 'transform, opacity';
    newMolecule.style.zIndex = String(300 + this.size);
    newMolecule.style.borderRadius = '50%';
    newMolecule.style.position = 'absolute';
    newMolecule.style.pointerEvents = 'none';
    containerElm.appendChild(newMolecule);
    this.el = newMolecule;
    return this;
  }

  step(dtFactor: number, timeSec: number, winW: number, winH: number): void {
    if (!this.el || !this.el.isConnected) return;

    this.x += this.speed.x * dtFactor;
    this.y += this.speed.y * dtFactor;

    if (this.y > winH) this.y = -this.size;
    else if (this.y < -this.size) this.y = winH;

    if (this.x > winW) this.x = -this.size;
    else if (this.x < -this.size) this.x = winW;

    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    const pulse = 0.2 + 0.2 * Math.sin(timeSec * 1.5 + this.phaseOffset);
    this.el.style.opacity = pulse.toFixed(3);
  }

  destroy(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    } else {
      const el = document.getElementById(String(this.id));
      if (el) el.remove();
    }
  }
}

let Molecules: Molecule[] = [];
let rafId: number | null = null;
let lastFrameTime = 0;

function tick(now: number): void {
  if (Molecules.length === 0) {
    rafId = null;
    return;
  }

  const dtMs = lastFrameTime ? Math.min(now - lastFrameTime, 100) : 16.67;
  lastFrameTime = now;
  const dtFactor = dtMs / 30; // preserve original 30ms step speed
  const timeSec = now / 1000;
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 768;

  for (let i = 0; i < Molecules.length; i++) {
    Molecules[i].step(dtFactor, timeSec, winW, winH);
  }

  rafId = requestAnimationFrame(tick);
}

export default {
  start: () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    Molecules.forEach((mol) => mol.destroy());
    Molecules = range(0, 20).map(() => new Molecule({ container: '#container' }).create());
    lastFrameTime = 0;
    if (typeof requestAnimationFrame !== 'undefined') {
      rafId = requestAnimationFrame(tick);
    }
  },
  end: () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    Molecules.forEach((mol) => mol.destroy());
    Molecules = [];
  }
};
