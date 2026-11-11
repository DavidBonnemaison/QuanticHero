import randomColor from 'randomcolor';
import { random, sample, range, max } from 'lodash';


class Molecule {
  constructor({ container }) {
    this.id = random(1000, 9999);
    this.container = container;
    this.size = sample([random(5, 10), random(10, 50)]);
    this.color = randomColor();
    this.x = random(0, window.innerWidth);
    this.y = random(0, window.innerHeight);
    this.speed = {
      x: random(-20, 20) * this.size / 1000,
      y: random(-20, 20) * this.size / 1000
    };
    this.opacity = max([random(50, 1000) / this.size ** 2, 0.2]);
  }

  getTemplate() {
    const elm = document.createElement('div');
    elm.classList.add('Molecule');
    elm.id = this.id;
    return elm;
  }

  setMotion() {
    this.motion = setInterval(() => {
      const el = document.getElementById('' + this.id);
      if (!el) {
        clearInterval(this.motion);
        return;
      }
      let topPosition = Number(el.style.top.slice(0, -2));
      if (topPosition > window.innerHeight) topPosition = this.size * -1;
      if (topPosition < this.size * -1) topPosition = window.innerHeight;
      let leftPosition = Number(el.style.left.slice(0, -2));
      if (leftPosition > window.innerWidth) leftPosition = this.size * -1;
      if (leftPosition < this.size * -1) leftPosition = window.innerWidth;
      el.style.left = leftPosition + this.speed.x + 'px';
      el.style.top = topPosition + this.speed.y + 'px';
    }, 30);
  }

  setOpacity() {
    this.opacityMore = setInterval(() => {
      const el = document.getElementById('' + this.id);
      if (!el) {
        clearInterval(this.opacityMore);
        return;
      }
      el.style.opacity = 0.4;
    }, 2000);
    this.opacityTimeout2 = setTimeout(() => {
      this.opacityLess = setInterval(() => {
        const el = document.getElementById('' + this.id);
        if (!el) {
          clearInterval(this.opacityLess);
          return;
        }
        el.style.opacity = 0;
      }, 2000);
    }, 1000);
  }

  create() {
    const containerElm = document.querySelector(this.container);
    if (!containerElm) return this;
    const newMolecule = this.getTemplate();
    newMolecule.style.width = `${this.size}px`;
    newMolecule.style.height = `${this.size}px`;
    newMolecule.style.background = this.color;
    newMolecule.style.opacity = this.opacity;
    newMolecule.style.left = `${this.x}px`;
    newMolecule.style.top = `${this.y}px`;
    newMolecule.style.zIndex = 300 + this.size;
    newMolecule.style.borderRadius = '50%';
    newMolecule.style.position = 'absolute';
    newMolecule.style.pointerEvents = 'none';
    newMolecule.style.transition = '1s opacity ease-in-out';
    containerElm.appendChild(newMolecule);
    this.setMotion();
    this.opacityTimeout1 = setTimeout(() => {
      this.setOpacity();
    }, random(100, 1500));
    return this;
  }

  destroy() {
    clearTimeout(this.opacityTimeout1);
    clearTimeout(this.opacityTimeout2);
    clearInterval(this.motion);
    clearInterval(this.opacityLess);
    clearInterval(this.opacityMore);
    const el = document.getElementById('' + this.id);
    if (el) {
      el.remove();
    }
  }
}

let Molecules = [];

export default {
  start: () =>
    range(0, 20).forEach(() => {
      Molecules.push(new Molecule({ container: '#container' }).create());
    }),
  end: () => {
    Molecules.map(mol => mol.destroy());
    Molecules = [];
  }
};
