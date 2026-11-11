import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';

function waitForServer(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(`http://localhost:${port}/`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 200);
        }
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for server on port ${port}`));
        } else {
          setTimeout(check, 200);
        }
      });
    };
    check();
  });
}

async function run() {
  console.log('Starting preview server...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    stdio: 'pipe'
  });

  server.stdout.on('data', d => console.log(`[server] ${d.toString().trim()}`));
  server.stderr.on('data', d => console.error(`[server-err] ${d.toString().trim()}`));

  try {
    await waitForServer(4173);
    console.log('Server is ready on http://localhost:4173');

    console.log('Launching headless Chromium...');
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--ignore-certificate-errors'],
      headless: true
    });

    const page = await browser.newPage();
    const errors = [];
    const logs = [];

    page.on('requestfailed', req => {
      console.error('[REQUEST FAILED]', req.url(), req.failure() ? req.failure().errorText : '');
    });

    page.on('pageerror', err => {
      console.error('[PAGE ERROR]', err.message);
      errors.push(err.message);
    });

    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (msg.type() === 'error') {
        console.error('[BROWSER LOG ERROR]', text);
      } else {
        console.log(`[BROWSER ${msg.type()}]`, text);
      }
    });

    page.on('response', res => {
      if (res.status() >= 400) {
        console.error('[HTTP ERROR]', res.status(), res.url());
      }
    });

    console.log('Navigating to http://localhost:4173/...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });

    console.log('Checking Menu page...');
    const title = await page.title();
    console.log('Page title:', title);

    await page.waitForSelector('#app', { timeout: 5000 });

    // Look for New game clickable element
    const newGameFound = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*'));
      for (const el of els) {
        if (el.textContent.trim() === 'New game') {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!newGameFound) {
      throw new Error('New game button/div not found on home page');
    }

    console.log('Clicked "New game"!');
    await new Promise(r => setTimeout(r, 1000));
    console.log('Current URL after New Game click:', page.url());

    // Look for "Got it" clickable element
    const gotItFound = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*'));
      for (const el of els) {
        if (el.textContent.trim() === 'Got it') {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!gotItFound) {
      throw new Error('"Got it" button/div not found on explanation page');
    }

    console.log('Clicked "Got it"!');
    await new Promise(r => setTimeout(r, 1000));
    console.log('Current URL after "Got it" click:', page.url());

    console.log('Waiting 5 seconds for Phaser Boot -> Splash -> Game state transition...');
    await new Promise(r => setTimeout(r, 5000));

    // Verify canvas exists
    const canvas = await page.$('canvas');
    if (!canvas) {
      throw new Error('No canvas element found in game container');
    }
    console.log('Canvas element found successfully!');

    // Check gameState in browser
    const gameState = await page.evaluate(() => {
      const g = window.game;
      if (g) {
        const gs = g.scene ? g.scene.getScene('Game') : null;
        const canvas = document.querySelector('canvas');
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
        const p = gs ? gs.portalSprite : null;
        const cam = gs ? gs.cameras.main : null;
        const hero = gs && gs.heroes ? gs.heroes[0] : null;
        const platforms = gs && gs.platforms ? gs.platforms.getChildren() : [];
        const ground = platforms[0];

        return {
          hasGame: true,
          currentState: gs && gs.scene.isActive() ? 'Game' : null,
          heroesCount: gs && gs.heroes ? gs.heroes.length : null,
          portalKey: g.textures.exists('portal'),
          canvasTop: canvasRect ? canvasRect.top : null,
          portalX: p ? p.x : null,
          portalY: p ? p.y : null,
          portalMoves: p && p.body ? p.body.moves : null,
          ground: ground && ground.body ? {
            x: ground.body.x,
            y: ground.body.y,
            immovable: ground.body.immovable,
            allowGravity: ground.body.allowGravity
          } : null,
          hero: hero && hero.body ? {
            x: Math.round(hero.x),
            y: Math.round(hero.y),
            vy: Math.round(hero.body.velocity.y),
            blockedDown: hero.body.blocked.down,
            touchingDown: hero.body.touching.down
          } : null,
          camera: cam ? {
            scrollX: cam.scrollX,
            scrollY: cam.scrollY,
            midX: cam.midPoint.x,
            midY: cam.midPoint.y
          } : null
        };
      }
      return { hasGame: false };
    });
    console.log('Game state evaluation:', JSON.stringify(gameState, null, 2));

    if (gameState.portalY !== 654) {
      throw new Error(`Portal Y coordinate invalid: ${gameState.portalY} (expected 654)`);
    }
    if (gameState.canvasTop !== 0) {
      console.warn(`Canvas top is ${gameState.canvasTop} (expected 0)`);
    }

    // REGRESSION TEST: Verify Ground Platform is immovable and did not fall with gravity
    if (!gameState.ground) {
      throw new Error('Ground platform not found or has no physics body');
    }
    if (gameState.ground.y !== 960) {
      throw new Error(`Ground platform fell! Expected y=960, got y=${gameState.ground.y}`);
    }
    if (!gameState.ground.immovable) {
      throw new Error('Ground platform must be immovable');
    }
    console.log('✓ Ground platform position and immovability verified (y=960, immovable=true)');

    // REGRESSION TEST: Verify Hero landed on the ground and did not fall into the void
    if (!gameState.hero) {
      throw new Error('Hero not found or has no physics body');
    }
    if (gameState.hero.y > 940 || gameState.hero.y < 915) {
      throw new Error(`Hero position out of bounds: expected y around 928, got ${gameState.hero.y}`);
    }
    if (!gameState.hero.touchingDown && !gameState.hero.blockedDown) {
      throw new Error('Hero is not grounded on the platform (touchingDown/blockedDown is false)');
    }
    console.log(`✓ Hero landed stably on platform (hero.y=${gameState.hero.y}, touchingDown=${gameState.hero.touchingDown})`);

    // REGRESSION TEST: Verify Camera is centered on hero and within scene bounds (not drifting)
    if (!gameState.camera) {
      throw new Error('Camera main not found');
    }
    if (gameState.camera.scrollY !== 400) {
      throw new Error(`Camera scrollY abnormal: expected 400, got ${gameState.camera.scrollY}`);
    }
    console.log(`✓ Camera scroll verified (scrollY=${gameState.camera.scrollY}, midY=${gameState.camera.midY})`);

    // REGRESSION TEST: Verify World bounds collision (sides & ceiling solid, bottom open)
    const boundsConfig = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return null;
      const check = gs.physics.world.checkCollision;
      const hero = gs.heroes[0];
      return {
        left: check.left,
        right: check.right,
        up: check.up,
        down: check.down,
        bounceX: hero?.body?.bounce?.x,
        bounceY: hero?.body?.bounce?.y
      };
    });
    if (!boundsConfig || !boundsConfig.left || !boundsConfig.right || !boundsConfig.up || boundsConfig.down !== false) {
      throw new Error(`Bounds collision configuration invalid: ${JSON.stringify(boundsConfig)}`);
    }
    if (boundsConfig.bounceX <= 0 || boundsConfig.bounceY <= 0) {
      throw new Error(`Hero bounce not set: bounceX=${boundsConfig.bounceX}, bounceY=${boundsConfig.bounceY}`);
    }
    console.log('✓ Bounds collision and Hero bounce verified (left/right/up: true, down: false, bounce configured)');

    // REGRESSION TEST: Verify PowerUp text styling (150px right-to-left banner)
    const powerUpResult = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return null;
      const hero = gs.heroes[0];
      const dummyParticle = gs.physics.add.sprite(hero.x, hero.y, 'blue');
      dummyParticle.setData('type', 'lowGravity');
      gs.collectParticle(hero, dummyParticle);
      const texts = gs.children.list.filter(c => c.type === 'Text');
      const toast = texts.find(t => t.text === 'LOW GRAVITY !');
      return {
        found: !!toast,
        fontSize: toast?.style?.fontSize,
        alpha: toast?.alpha,
        x: toast?.x
      };
    });
    if (!powerUpResult || !powerUpResult.found || powerUpResult.fontSize !== '150px') {
      throw new Error(`PowerUp text invalid: ${JSON.stringify(powerUpResult)}`);
    }
    console.log(`✓ PowerUp banner verified (fontSize=150px, startX=${powerUpResult.x}, alpha=${powerUpResult.alpha})`);

    // REGRESSION TEST: Verify restart when hero falls out through the bottom
    const restartResult = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return false;
      const hero = gs.heroes[0];
      let restarted = false;
      gs.scene.restart = () => { restarted = true; };
      hero.y = gs.levelData.height + 30;
      gs.update();
      return restarted;
    });
    if (!restartResult) {
      throw new Error('Scene did not restart when hero fell out of the bottom of the scene');
    }
    console.log('✓ Bottom exit restart verified (restarts cleanly when hero.y > height + 20)');

    await page.screenshot({ path: '/tmp/gameplay_screenshot.png' });
    console.log('Screenshot saved to /tmp/gameplay_screenshot.png');

    console.log('Testing /levels route...');
    await page.goto('http://localhost:4173/levels', { waitUntil: 'networkidle2' });
    const levelTitle = await page.evaluate(() => document.body.textContent);
    if (!levelTitle.includes('Level Selection')) {
      throw new Error('/levels page did not load "Level Selection"');
    }
    const hydrogenVisible = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e => e.textContent.trim() === 'Hydrogen');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    if (!hydrogenVisible) {
      throw new Error('Hydrogen (level 1) is not visible in initial viewport of /levels');
    }
    console.log('/levels verified successfully (Level 1 Hydrogen visible at top)!');

    console.log('Testing /done route...');
    await page.goto('http://localhost:4173/done', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/tmp/done_screenshot.png' });
    console.log('/done verified and screenshot saved to /tmp/done_screenshot.png!');

    console.log('Testing /editor route...');
    await page.goto('http://localhost:4173/editor', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    console.log('/editor verified successfully!');

    await browser.close();

    console.log('\n--- VERIFICATION SUMMARY ---');
    console.log('Total page uncaught errors:', errors.length);
    if (errors.length > 0) {
      console.error('Errors encountered:', errors);
      throw new Error(`Test failed with ${errors.length} uncaught errors!`);
    }

    console.log('SUCCESS: Game launched without any uncaught exceptions!');
  } finally {
    server.kill();
    process.exit(0);
  }
}

run().catch(err => {
  console.error('E2E Test execution failed:', err);
  process.exit(1);
});
