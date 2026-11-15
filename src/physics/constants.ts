export const PHYSICS = {
  GRAVITY_Y: 700, // Gravité verticale standard (px/s²)
  HERO_JUMP_V0: -450, // Impulsion de saut standard (px/s)
  HERO_SPEED_X: 350, // Vitesse de course standard (px/s)
  HERO_SPEED_BOOST: 1.4, // Multiplicateur sous power-up 'speed'
  WALL_RECOIL_VX: 300, // Impulsion de rebond mural (px/s)
  WALL_RECOIL_VY_JUMP: -160, // Bonus vertical si saut maintenu au rebond (px/s)
  WALL_RECOIL_VY: -100, // Bonus vertical sans touche saut (px/s)
  WALL_RECOIL_TIMER_MS: 220,
  DELTA_FIXED_MS: 1000 / 60, // Pas de simulation fixe (16.666 ms)
  HERO_WIDTH: 64,
  HERO_HEIGHT: 64,
  AIR_DRAG_X: 0.98,
  WALL_RECOIL_DRAG_X: 0.94,
  CEILING_BOUNCE_VY: 220
} as const;

export type Physics = typeof PHYSICS;
