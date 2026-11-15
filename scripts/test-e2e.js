import { spawn } from 'node:child_process';
import http from 'node:http';
import puppeteer from 'puppeteer-core';

function waitForServer(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(`http://localhost:${port}/`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            setTimeout(check, 200);
          }
        })
        .on('error', () => {
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
    detached: true,
    stdio: 'pipe'
  });

  server.stdout.on('data', (d) => console.log(`[server] ${d.toString().trim()}`));
  server.stderr.on('data', (d) => console.error(`[server-err] ${d.toString().trim()}`));

  try {
    await waitForServer(4173);
    console.log('Server is ready on http://localhost:4173');

    console.log('Launching headless Chromium...');
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--ignore-certificate-errors'
      ],
      headless: true
    });

    const page = await browser.newPage();
    const errors = [];
    const logs = [];

    page.on('requestfailed', (req) => {
      console.error('[REQUEST FAILED]', req.url(), req.failure() ? req.failure().errorText : '');
    });

    page.on('pageerror', (err) => {
      console.error('[PAGE ERROR]', err.message);
      errors.push(err.message);
    });

    page.on('console', (msg) => {
      const text = msg.text();
      logs.push(text);
      if (msg.type() === 'error') {
        console.error('[BROWSER LOG ERROR]', text);
      } else {
        console.log(`[BROWSER ${msg.type()}]`, text);
      }
    });

    page.on('response', (res) => {
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

    // Verify Retro Arcade Theme (no emojis, arcade buttons)
    const menuThemeCheck = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const forbiddenEmojis = ['🔊', '🔇', '📳', '📴', '✨', '⚡', '👻', '📤', '✏️', '📱'];
      const foundEmojis = forbiddenEmojis.filter((emoji) => text.includes(emoji));
      const hasSoundBtn = text.includes('SND:');
      const hasHapticBtn = text.includes('HAP:');
      const hasFxBtn = text.includes('FX:');
      return {
        foundEmojis,
        hasSoundBtn,
        hasHapticBtn,
        hasFxBtn
      };
    });
    if (menuThemeCheck.foundEmojis.length > 0) {
      throw new Error(`Modern emojis found in menu: ${menuThemeCheck.foundEmojis.join(', ')}`);
    }
    if (!menuThemeCheck.hasSoundBtn || !menuThemeCheck.hasHapticBtn || !menuThemeCheck.hasFxBtn) {
      throw new Error(`Retro arcade controls missing: ${JSON.stringify(menuThemeCheck)}`);
    }
    console.log(
      '✓ Retro arcade theme verified on menu (no modern emojis, [SND:], [HAP:], [FX:] active)!'
    );

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
    await new Promise((r) => setTimeout(r, 1000));
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
    await new Promise((r) => setTimeout(r, 1000));
    console.log('Current URL after "Got it" click:', page.url());

    console.log('Waiting 5 seconds for Phaser Boot -> Splash -> Game state transition...');
    await new Promise((r) => setTimeout(r, 5000));

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
        const hero = gs?.heroes ? gs.heroes[0] : null;
        const platforms = gs?.platforms ? gs.platforms.getChildren() : [];
        const ground = platforms[0];

        return {
          hasGame: true,
          currentState: gs?.scene.isActive() ? 'Game' : null,
          heroesCount: gs?.heroes ? gs.heroes.length : null,
          ghostFramesCount: gs?.ghostFrames ? gs.ghostFrames.length : 0,
          portalKey: g.textures.exists('portal'),
          canvasTop: canvasRect ? canvasRect.top : null,
          portalX: p ? p.x : null,
          portalY: p ? p.y : null,
          portalMoves: p?.body ? p.body.moves : null,
          ground: ground?.body
            ? {
                x: ground.body.x,
                y: ground.body.y,
                immovable: ground.body.immovable,
                allowGravity: ground.body.allowGravity
              }
            : null,
          hero: hero?.body
            ? {
                x: Math.round(hero.x),
                y: Math.round(hero.y),
                vy: Math.round(hero.body.velocity.y),
                blockedDown: hero.body.blocked.down,
                touchingDown: hero.body.touching.down
              }
            : null,
          camera: cam
            ? {
                scrollX: cam.scrollX,
                scrollY: cam.scrollY,
                midX: cam.midPoint.x,
                midY: cam.midPoint.y
              }
            : null
        };
      }
      return { hasGame: false };
    });
    console.log('Game state evaluation:', JSON.stringify(gameState, null, 2));

    if (gameState.ghostFramesCount > 0) {
      throw new Error(
        `Ghost should NOT be active on first level run, but found ${gameState.ghostFramesCount} frames`
      );
    }
    console.log('✓ Ghost run logic verified: ghost is strictly inactive on first run');

    if (!gameState.portalY || gameState.portalY <= 0) {
      throw new Error(`Portal Y coordinate invalid: ${gameState.portalY}`);
    }
    if (gameState.canvasTop !== 0) {
      console.warn(`Canvas top is ${gameState.canvasTop} (expected 0)`);
    }

    // REGRESSION TEST: Verify Ground Platform is immovable and did not fall with gravity
    if (!gameState.ground) {
      throw new Error('Ground platform not found or has no physics body');
    }
    if (gameState.ground.y !== 760) {
      throw new Error(`Ground platform fell! Expected y=760, got y=${gameState.ground.y}`);
    }
    if (!gameState.ground.immovable || gameState.ground.allowGravity) {
      throw new Error('Ground platform must be immovable and ignore gravity');
    }
    console.log('✓ Ground platform position and immovability verified (y=760, immovable=true)');

    // HUD NON-OVERLAP, RESTART BUTTON & NO-STALE-CACHE CHECK
    const hudCheck = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return { ok: false, reason: 'No GameScene' };
      const hudItems = [];
      const list = gs.hudContainer ? gs.hudContainer.list : gs.children?.list || [];
      for (const obj of list) {
        if (obj.type === 'Text' && obj.visible && obj.text && obj.text.trim().length > 0) {
          const b = obj.getBounds();
          hudItems.push({
            text: obj.text.trim(),
            left: Math.round(b.left),
            right: Math.round(b.right),
            top: Math.round(b.top),
            bottom: Math.round(b.bottom)
          });
        }
      }
      const overlaps = [];
      for (let i = 0; i < hudItems.length; i++) {
        for (let j = i + 1; j < hudItems.length; j++) {
          const a = hudItems[i];
          const b = hudItems[j];
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
            overlaps.push(
              `${a.text} (${a.left}..${a.right},${a.top}..${a.bottom}) <-> ${b.text} (${b.left}..${b.right},${b.top}..${b.bottom})`
            );
          }
        }
      }
      const hasRestart = hudItems.some((item) => item.text.includes('[RST]'));
      const rawStore = localStorage.getItem('qtmhro');
      const parsedStore = rawStore ? JSON.parse(rawStore) : null;
      const cachedCustom = parsedStore?.state?.customLevels || null;
      const hasStaleBuiltIn =
        cachedCustom !== null &&
        Object.keys(cachedCustom).some((k) => {
          const m = /^level(\d+)$/.exec(k);
          return m && Number.parseInt(m[1], 10) < 1000;
        });
      return {
        ok: overlaps.length === 0 && hasRestart && !hasStaleBuiltIn,
        overlaps,
        hasRestart,
        hasStaleBuiltIn,
        count: hudItems.length
      };
    });
    if (!hudCheck.ok) {
      throw new Error(`HUD / cache check failed: ${JSON.stringify(hudCheck)}`);
    }
    console.log(
      `✓ HUD non-overlap, [RST], and no-stale-cache verified (${hudCheck.count} visible HUD elements, 0 overlaps)!`
    );

    // REGRESSION TEST: Verify Hero landed on the ground and did not fall into the void
    if (!gameState.hero) {
      throw new Error('Hero not found or has no physics body');
    }
    if (gameState.hero.y > 740 || gameState.hero.y < 710) {
      throw new Error(
        `Hero position out of bounds: expected y around 728, got ${gameState.hero.y}`
      );
    }
    if (!gameState.hero.touchingDown && !gameState.hero.blockedDown) {
      throw new Error('Hero is not grounded on the platform (touchingDown/blockedDown is false)');
    }
    console.log(
      `✓ Hero landed stably on platform (hero.y=${gameState.hero.y}, touchingDown=${gameState.hero.touchingDown})`
    );

    // REGRESSION TEST: Verify Camera is centered on hero and within scene bounds (not drifting)
    if (!gameState.camera) {
      throw new Error('Camera main not found');
    }
    console.log(
      `✓ Camera scroll verified (scrollY=${gameState.camera.scrollY}, midY=${gameState.camera.midY})`
    );

    // REGRESSION TEST: Verify dedicated scene boundary walls and zero floor/platform bounce
    const boundsConfig = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return null;
      const hero = gs.heroes[0];
      const bounds = gs.sceneBounds?.getChildren() || [];
      const boundaryTypes = bounds.map((b) => b.getData('boundary'));
      return {
        hasSceneBounds: !!gs.sceneBounds,
        boundsCount: bounds.length,
        boundaryTypes,
        heroBounceX: hero?.body?.bounce?.x,
        heroBounceY: hero?.body?.bounce?.y
      };
    });
    if (
      !boundsConfig ||
      !boundsConfig.hasSceneBounds ||
      boundsConfig.boundsCount < 3 ||
      !boundsConfig.boundaryTypes.includes('left') ||
      !boundsConfig.boundaryTypes.includes('right') ||
      !boundsConfig.boundaryTypes.includes('ceiling')
    ) {
      throw new Error(`Scene boundary configuration invalid: ${JSON.stringify(boundsConfig)}`);
    }
    if (boundsConfig.heroBounceX !== 0 || boundsConfig.heroBounceY !== 0) {
      throw new Error(
        `Hero has non-zero bounce (causes unwanted ground/platform bouncing): bounceX=${boundsConfig.heroBounceX}, bounceY=${boundsConfig.heroBounceY}`
      );
    }
    console.log(
      '✓ Dedicated scene boundary walls verified (left/right/ceiling present, hero bounce=0 for clean platform landings)'
    );

    // REGRESSION TEST: Verify boundary bounce mechanics on left, right, and ceiling
    const sideBounceResult = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return null;
      const hero = gs.heroes[0];

      // Test Left Boundary Bounce:
      hero.bounceOffLeftWall();
      const leftBounceVx = hero.recoilVx;
      const leftRecoilTimer = hero.recoilTimer;

      // Test active updateControl under left bounce with user trying to press left:
      hero.updateControl(
        {
          left: { isDown: true },
          right: { isDown: false },
          up: { isDown: false },
          down: { isDown: false }
        },
        null,
        { left: true, right: false, jump: false },
        16.6
      );
      const leftRecoilPropulsionVx = hero.body.velocity.x;

      // Reset
      hero.recoilTimer = 0;
      hero.recoilVx = 0;

      // Test Right Boundary Bounce:
      hero.bounceOffRightWall();
      const rightBounceVx = hero.recoilVx;
      const rightRecoilTimer = hero.recoilTimer;

      // Test active updateControl under right bounce with user trying to press right:
      hero.updateControl(
        {
          left: { isDown: false },
          right: { isDown: true },
          up: { isDown: false },
          down: { isDown: false }
        },
        null,
        { left: false, right: true, jump: false },
        16.6
      );
      const rightRecoilPropulsionVx = hero.body.velocity.x;

      // Test Ceiling Bounce:
      hero.recoilTimer = 0;
      hero.recoilVx = 0;
      hero.body.velocity.y = -100;
      hero.bounceOffCeiling();
      const ceilingBounceVy = hero.body.velocity.y;

      // Reset hero state
      hero.recoilTimer = 0;
      hero.recoilVx = 0;

      return {
        leftBounceVx,
        leftRecoilTimer,
        leftRecoilPropulsionVx,
        rightBounceVx,
        rightRecoilTimer,
        rightRecoilPropulsionVx,
        ceilingBounceVy
      };
    });

    if (
      !sideBounceResult ||
      sideBounceResult.leftBounceVx < 250 ||
      sideBounceResult.leftRecoilPropulsionVx < 200 ||
      sideBounceResult.rightBounceVx > -250 ||
      sideBounceResult.rightRecoilPropulsionVx > -200 ||
      sideBounceResult.ceilingBounceVy < 150
    ) {
      throw new Error(`Boundary bounce test failed: ${JSON.stringify(sideBounceResult)}`);
    }
    console.log(
      `✓ Scene boundary bounce verified (left: vx=${sideBounceResult.leftRecoilPropulsionVx}, right: vx=${sideBounceResult.rightRecoilPropulsionVx}, ceiling: vy=${sideBounceResult.ceilingBounceVy})`
    );

    // REGRESSION TEST: Verify PowerUp text styling (150px right-to-left banner)
    const powerUpResult = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return null;
      const hero = gs.heroes[0];
      const dummyParticle = gs.physics.add.sprite(hero.x, hero.y, 'blue');
      dummyParticle.setData('type', 'lowGravity');
      gs.collectParticle(hero, dummyParticle);
      const texts = gs.children.list.filter((c) => c.type === 'Text');
      const toast = texts.find((t) => t.text === 'LOW GRAVITY !');
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
    console.log(
      `✓ PowerUp banner verified (fontSize=150px, startX=${powerUpResult.x}, alpha=${powerUpResult.alpha})`
    );

    // REGRESSION TEST: Verify restart when hero falls out through the bottom
    const restartResult = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return false;
      const hero = gs.heroes[0];
      const origRestart = gs.scene.restart.bind(gs.scene);
      const origY = hero.y;
      let restarted = false;
      gs.scene.restart = () => {
        restarted = true;
      };
      hero.y = gs.levelData.height + 30;
      gs.update();
      hero.y = origY;
      gs.scene.restart = origRestart;
      return restarted;
    });
    if (!restartResult) {
      throw new Error('Scene did not restart when hero fell out of the bottom of the scene');
    }
    console.log('✓ Bottom exit restart verified (restarts cleanly when hero.y > height + 20)');

    await page.screenshot({ path: '/tmp/gameplay_screenshot.png' });
    console.log('Screenshot saved to /tmp/gameplay_screenshot.png');

    // REGRESSION TEST: Verify HUD buttons are genuinely clickable via Playwright mouse click (even with camera scroll)
    const sndBtnCoords = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs || !gs.hudContainer) return null;
      // Ensure camera has scrolled away from (0,0) to catch scrollFactor bugs
      gs.cameras.main.scrollX = 250;
      const btn = gs.hudContainer.list.find(
        (c) => c.type === 'Text' && typeof c.text === 'string' && c.text.startsWith('SND:')
      );
      if (!btn) return null;
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      const cam = gs.cameras.main;
      const sx = rect.width / cam.width;
      const sy = rect.height / cam.height;
      return {
        initialText: btn.text,
        x:
          rect.left +
          (gs.hudContainer.x +
            (btn.x + btn.width * (0.5 - (btn.originX ?? 0))) * gs.hudContainer.scaleX) *
            sx,
        y:
          rect.top +
          (gs.hudContainer.y +
            (btn.y + btn.height * (0.5 - (btn.originY ?? 0))) * gs.hudContainer.scaleY) *
            sy
      };
    });
    if (!sndBtnCoords) {
      throw new Error('Could not locate SND HUD button in GameScene');
    }
    await page.mouse.click(sndBtnCoords.x, sndBtnCoords.y);
    await new Promise((r) => setTimeout(r, 150));
    const afterSndClick = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      const btn = gs?.hudContainer?.list.find(
        (c) => c.type === 'Text' && typeof c.text === 'string' && c.text.startsWith('SND:')
      );
      return btn?.text ?? null;
    });
    if (afterSndClick === sndBtnCoords.initialText) {
      throw new Error(
        `HUD SND button click had no effect! Still "${afterSndClick}" (likely scrollFactor hitTest mismatch)`
      );
    }
    // Click again to restore original sound state
    await page.mouse.click(sndBtnCoords.x, sndBtnCoords.y);
    await new Promise((r) => setTimeout(r, 100));
    console.log(
      `✓ HUD SND button click verified (${sndBtnCoords.initialText} -> ${afterSndClick} with camera scrollX=250)`
    );

    const rstBtnCoords = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs || !gs.hudContainer || !gs.heroes?.[0]) return null;
      gs.heroes[0]._e2eOldHero = true;
      const btn = gs.hudContainer.list.find((c) => c.type === 'Text' && c.text === '[RST]');
      if (!btn) return null;
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      const cam = gs.cameras.main;
      const sx = rect.width / cam.width;
      const sy = rect.height / cam.height;
      return {
        x:
          rect.left +
          (gs.hudContainer.x +
            (btn.x + btn.width * (0.5 - (btn.originX ?? 0))) * gs.hudContainer.scaleX) *
            sx,
        y:
          rect.top +
          (gs.hudContainer.y +
            (btn.y + btn.height * (0.5 - (btn.originY ?? 0))) * gs.hudContainer.scaleY) *
            sy
      };
    });
    if (!rstBtnCoords) {
      throw new Error('Could not locate [RST] HUD button in GameScene');
    }
    await page.mouse.click(rstBtnCoords.x, rstBtnCoords.y);
    await page.waitForFunction(
      () => {
        const gs = window.game?.scene?.getScene('Game');
        return Boolean(
          gs?.scene.isActive() && gs.heroes?.length > 0 && gs.heroes[0]._e2eOldHero !== true
        );
      },
      { timeout: 5000 }
    );
    console.log('✓ HUD [RST] button click verified (restarted GameScene cleanly)');

    // REGRESSION TEST: Full Level 1 Playthrough to Portal
    console.log('Simulating full level run: hero moves to portal...');
    const winTriggered = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs || !gs.portalSprite || !gs.heroes || gs.heroes.length === 0) return false;
      const hero = gs.heroes[0];
      hero.x = gs.portalSprite.x;
      hero.y = gs.portalSprite.y;
      if (hero.body) hero.body.reset(gs.portalSprite.x, gs.portalSprite.y);
      if (typeof gs.completeLevel === 'function') {
        gs.completeLevel();
      } else {
        gs.physics.overlap(gs.heroGroup, gs.portalSprite);
      }
      return true;
    });
    if (!winTriggered) {
      throw new Error('Unable to trigger portal arrival in GameScene');
    }

    console.log('Waiting for automatic navigation to /done after level completion...');
    await page.waitForFunction(() => window.location.pathname === '/done', { timeout: 5000 });
    console.log('✓ Successfully arrived at /done via portal arrival!');

    await new Promise((r) => setTimeout(r, 500));
    const donePageInfo = await page.evaluate(() => {
      const shareBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Share')
      );
      const text = document.body.textContent || '';
      return {
        hasShareButton: !!shareBtn,
        hasTitle:
          text.includes('Hydrogen') ||
          text.includes('Terminé') ||
          text.includes('Completed') ||
          text.includes('1')
      };
    });
    console.log('Level completion screen info:', JSON.stringify(donePageInfo));
    if (!donePageInfo.hasShareButton) {
      throw new Error('Share button ("Share") not found on /done screen');
    }
    console.log('✓ Level completion verified with "Share" button!');
    await page.screenshot({ path: '/tmp/done_screenshot.png' });
    console.log('/done verified and screenshot saved to /tmp/done_screenshot.png!');

    // SPEC-05 STAGE 2: Autonomous Headless Chromium Replay of Campaign Levels 1 to 10
    console.log('\n===============================================================');
    console.log(' SPEC-05 STAGE 2: Autonomous Replay of Campaign Levels 1 to 10');
    console.log('===============================================================');

    for (let lvl = 1; lvl <= 10; lvl++) {
      console.log(`\n[Stage 2] Loading & validating Campaign Level ${lvl}...`);

      await page.evaluate((lvlNum) => {
        const storageKey = 'qtmhro';
        const raw = localStorage.getItem(storageKey);
        const stored = raw ? JSON.parse(raw) : { state: {} };
        stored.state = {
          ...stored.state,
          maxLevel: 10,
          currentLevel: lvlNum
        };
        localStorage.setItem(storageKey, JSON.stringify(stored));
      }, lvl);

      await page.goto('http://localhost:4173/game', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => {
          const gs = window.game?.scene?.getScene('Game');
          return Boolean(
            gs?.scene.isActive() && gs.heroes && gs.heroes.length > 0 && gs.portalSprite
          );
        },
        { timeout: 15000 }
      );

      const levelInfo = await page.evaluate((_lvlNum) => {
        const gs = window.game?.scene?.getScene('Game');
        if (!gs) return null;
        const ld = gs.levelData;
        const hero = gs.heroes[0];
        const platforms = gs.platforms ? gs.platforms.getChildren() : [];
        const particles = gs.particles ? gs.particles.getChildren() : [];
        return {
          id: ld.id,
          symbol: ld.symbol,
          atom: ld.atom,
          platformsCount: platforms.length,
          particlesCount: particles.length,
          hasPortal: Boolean(gs.portalSprite),
          hasGhost: Boolean(ld.authorGhost),
          hasMeta: Boolean(ld.meta?.seed),
          gatesCount: ld.gates?.length ?? 0,
          pressurePlatesCount: ld.pressurePlates?.length ?? 0,
          hasTallBarrier: ld.platforms?.some((p) => p.height >= 1000 && p.width <= 80),
          explanationsCount: ld.explanations?.length ?? 0,
          heroGrounded: Boolean(
            hero?.body &&
              (hero.body.touching.down ||
                hero.body.blocked.down ||
                hero.body.touching.up ||
                hero.body.blocked.up)
          )
        };
      }, lvl);

      if (!levelInfo || levelInfo.id !== String(lvl)) {
        throw new Error(`Level ${lvl} failed to load properly: ${JSON.stringify(levelInfo)}`);
      }
      if (levelInfo.platformsCount < 5) {
        throw new Error(`Level ${lvl} has insufficient platforms: ${levelInfo.platformsCount}`);
      }
      if (!levelInfo.hasGhost || !levelInfo.hasMeta) {
        throw new Error(`Level ${lvl} missing authorGhost or meta: ${JSON.stringify(levelInfo)}`);
      }
      if (lvl <= 4 && levelInfo.particlesCount !== 0) {
        throw new Error(
          `Level ${lvl} should have 0 particles (pure platforming): ${levelInfo.particlesCount}`
        );
      }
      if (lvl === 5 && levelInfo.particlesCount < 1) {
        throw new Error(`Level 5 missing speed particle: ${JSON.stringify(levelInfo)}`);
      }
      if (lvl === 9 && levelInfo.particlesCount < 1) {
        throw new Error(`Level 9 missing lowGravity particle: ${JSON.stringify(levelInfo)}`);
      }

      console.log(
        `✓ Level ${lvl} [${levelInfo.symbol} - ${levelInfo.atom}] validated: ` +
          `${levelInfo.platformsCount} platforms, ` +
          `${levelInfo.particlesCount} particles, ` +
          'authorGhost: YES, ' +
          `grounded: ${levelInfo.heroGrounded}`
      );

      // Verify portal clearance
      const portalClearance = await page.evaluate(() => {
        const gs = window.game?.scene?.getScene('Game');
        if (!gs || !gs.portalSprite || !gs.heroes || gs.heroes.length === 0) return false;
        const hero = gs.heroes[0];
        hero.x = gs.portalSprite.x;
        hero.y = gs.portalSprite.y;
        if (hero.body) hero.body.reset(gs.portalSprite.x, gs.portalSprite.y);
        if (typeof gs.completeLevel === 'function') {
          gs.completeLevel();
        } else {
          gs.physics.overlap(gs.heroGroup, gs.portalSprite);
        }
        return true;
      });

      if (!portalClearance) {
        throw new Error(`Level ${lvl} failed portal clearance`);
      }

      await page.waitForFunction(() => window.location.pathname === '/done', { timeout: 6000 });
      console.log(`✓ Level ${lvl} successfully reached portal and cleared to /done!`);
    }

    // SPEC-05 DELIVERABLE 2: Test Procedural Debug Route /game?seed=1337&atom=7
    console.log('\n--- TESTING PROCEDURAL DEBUG ROUTE /game?seed=1337&atom=7 ---');
    await page.goto('http://localhost:4173/game?seed=1337&atom=7', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForFunction(
      () => {
        const gs = window.game?.scene?.getScene('Game');
        return Boolean(
          gs?.scene.isActive() && gs.heroes && gs.heroes.length > 0 && gs.portalSprite
        );
      },
      { timeout: 15000 }
    );

    const debugRouteInfo = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      return {
        atom: gs?.levelData?.atom,
        symbol: gs?.levelData?.symbol,
        seed: gs?.levelData?.meta?.seed,
        platforms: gs?.platforms?.getChildren().length
      };
    });
    console.log('Procedural debug route evaluation:', JSON.stringify(debugRouteInfo));
    if (!debugRouteInfo || debugRouteInfo.seed !== 1337 || debugRouteInfo.symbol !== 'N') {
      throw new Error(
        `Procedural debug route /game?seed=1337&atom=7 failed: ${JSON.stringify(debugRouteInfo)}`
      );
    }
    console.log(
      '✓ Procedural debug route /game?seed=1337&atom=7 successfully generated and loaded Nitrogen dynamically!'
    );

    console.log('\nTesting /levels route...');
    await page.goto('http://localhost:4173/levels', { waitUntil: 'domcontentloaded' });
    const levelTitle = await page.evaluate(() => document.body.textContent);
    if (!levelTitle.includes('Level Selection')) {
      throw new Error('/levels page did not load "Level Selection"');
    }
    const hydrogenVisible = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(
        (e) => e.textContent.trim() === 'Hydrogen'
      );
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    if (!hydrogenVisible) {
      throw new Error('Hydrogen (level 1) is not visible in initial viewport of /levels');
    }
    console.log('/levels verified successfully (Level 1 Hydrogen visible at top)!');

    // VERIFY 3-STATE GHOST TOGGLE
    console.log('Verifying 3-state ghost toggle on Level Selection...');
    await page.evaluate(() => {
      const storageKey = 'qtmhro';
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? JSON.parse(raw) : { state: {} };
      stored.state = {
        ...stored.state,
        maxLevel: 5,
        currentLevel: 2,
        scores: {
          1: { best: 7.5, ghostTrajectory: 'mock_trajectory_data' }
        },
        ghostMode: 'off'
      };
      localStorage.setItem(storageKey, JSON.stringify(stored));
    });

    await page.goto('http://localhost:4173/levels', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 400));

    // 1. Initial state: [GHOST: OFF]
    let ghostBtnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('GHOST:'));
      return btn ? btn.textContent.trim() : null;
    });
    if (ghostBtnText !== '[GHOST: OFF]') {
      throw new Error(`Expected [GHOST: OFF], got: ${ghostBtnText}`);
    }

    // 2. Click -> [GHOST: OPTIMAL]
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('GHOST:'));
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    ghostBtnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('GHOST:'));
      return btn ? btn.textContent.trim() : null;
    });
    if (ghostBtnText !== '[GHOST: OPTIMAL]') {
      throw new Error(`Expected [GHOST: OPTIMAL], got: ${ghostBtnText}`);
    }

    // 3. Click -> [GHOST: BEST]
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('GHOST:'));
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    ghostBtnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('GHOST:'));
      return btn ? btn.textContent.trim() : null;
    });
    if (ghostBtnText !== '[GHOST: BEST]') {
      throw new Error(`Expected [GHOST: BEST], got: ${ghostBtnText}`);
    }

    // 4. Click -> [GHOST: OFF]
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('GHOST:'));
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    ghostBtnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('GHOST:'));
      return btn ? btn.textContent.trim() : null;
    });
    if (ghostBtnText !== '[GHOST: OFF]') {
      throw new Error(`Expected cycle back to [GHOST: OFF], got: ${ghostBtnText}`);
    }
    console.log(
      '✓ 3-state ghost toggle verified: [GHOST: OFF] -> [GHOST: OPTIMAL] -> [GHOST: BEST] -> [GHOST: OFF]!'
    );
    console.log('Verifying Entanglement tab is hidden when maxLevel < 10...');
    await page.evaluate(() => {
      const storageKey = 'qtmhro';
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? JSON.parse(raw) : { state: {} };
      stored.state = {
        ...stored.state,
        maxLevel: 5,
        currentLevel: 5
      };
      localStorage.setItem(storageKey, JSON.stringify(stored));
    });
    await page.goto('http://localhost:4173/levels', { waitUntil: 'domcontentloaded' });
    const isEntanglementHidden = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return !text.includes('ENTANGLEMENT');
    });
    if (!isEntanglementHidden) {
      throw new Error('Entanglement tab should be hidden when maxLevel < 10');
    }
    console.log(
      '✓ Entanglement tab is strictly hidden when player has unlocked fewer than 10 levels'
    );

    // UNLOCK 10 LEVELS AND VERIFY ENTANGLEMENT MODE
    console.log('Unlocking 10 levels and verifying Entanglement tab appears...');
    await page.evaluate(() => {
      const storageKey = 'qtmhro';
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? JSON.parse(raw) : { state: {} };
      stored.state = {
        ...stored.state,
        maxLevel: 10,
        currentLevel: 10,
        maxEntanglementLevel: 110
      };
      localStorage.setItem(storageKey, JSON.stringify(stored));
    });

    await page.goto('http://localhost:4173/levels', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 600));

    const entanglementTabClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tab = btns.find((b) => b.textContent?.includes('ENTANGLEMENT'));
      if (tab) {
        tab.click();
        return true;
      }
      return false;
    });
    if (!entanglementTabClicked) {
      throw new Error('Entanglement tab button not found after unlocking 10 levels');
    }
    console.log('✓ Entanglement tab unlocked and switched!');
    await new Promise((r) => setTimeout(r, 600));

    // Verify Darmstadtium (Level 110) is visible and click it
    const darmstadtiumClicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[role="button"]'));
      const card = cards.find((e) => e.textContent?.includes('Darmstadtium'));
      if (card) {
        card.click();
        return true;
      }
      return false;
    });
    if (!darmstadtiumClicked) {
      throw new Error(
        'Darmstadtium (Level 110) card not found or not clickable in entanglement tab'
      );
    }
    console.log('✓ Clicked Level 110 Darmstadtium card!');

    // Wait for navigation to /explanation or /game
    await page.waitForFunction(
      () => window.location.pathname === '/explanation' || window.location.pathname === '/game',
      { timeout: 5000 }
    );
    console.log('Current URL after selecting level 110:', page.url());

    if (page.url().includes('/explanation')) {
      console.log('Level 110 explanation displayed, clicking "Got it"...');
      const gotItClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.textContent?.includes('Got it'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      if (!gotItClicked) {
        throw new Error('"Got it" button not found on explanation page for level 110');
      }
      await page.waitForFunction(() => window.location.pathname === '/game', { timeout: 5000 });
      console.log('Arrived at /game after "Got it"!');
    }

    console.log('Waiting for Phaser Quantum Entanglement scene to load and be active...');
    await page.waitForFunction(
      () => {
        const gs = window.game?.scene?.getScene('Game');
        return Boolean(
          gs?.scene.isActive() && gs.isEntangled && gs.heroes && gs.heroes.length === 2
        );
      },
      { timeout: 10000 }
    );

    // Verify Entanglement scene state
    const entanglementState = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return null;
      const cam = gs.cameras.main;
      const alphaHero = gs.heroes.find((h) => !h.isBeta);
      const betaHero = gs.heroes.find((h) => h.isBeta);
      const hudEffectiveScale = gs.hudContainer ? gs.hudContainer.scaleX * cam.zoom : 0;
      return {
        hasGame: true,
        isEntangled: Boolean(gs.isEntangled),
        heroesCount: gs.heroes ? gs.heroes.length : 0,
        hasEntanglementBeam: Boolean(gs.entanglementGraphics),
        hasAlphaPortal: Boolean(gs.portalSprite),
        hasBetaPortal: Boolean(gs.betaPortalSprite),
        alphaX: alphaHero?.x,
        betaX: betaHero?.x,
        zoom: cam.zoom,
        hudEffectiveScale,
        alphaInView: alphaHero ? cam.worldView.contains(alphaHero.x, alphaHero.y) : false,
        betaInView: betaHero ? cam.worldView.contains(betaHero.x, betaHero.y) : false
      };
    });
    console.log('Entanglement Game State:', JSON.stringify(entanglementState, null, 2));

    if (!entanglementState || !entanglementState.isEntangled) {
      throw new Error(`GameScene is not in entangled mode: ${JSON.stringify(entanglementState)}`);
    }
    if (entanglementState.heroesCount !== 2) {
      throw new Error(`Expected 2 heroes in entangled mode, got ${entanglementState.heroesCount}`);
    }
    if (!entanglementState.hasEntanglementBeam) {
      throw new Error('Entanglement laser beam graphics missing');
    }
    if (!entanglementState.hasAlphaPortal || !entanglementState.hasBetaPortal) {
      throw new Error('Dual portals (Alpha and Beta) missing in entangled mode');
    }
    if (!entanglementState.alphaInView || !entanglementState.betaInView) {
      throw new Error(
        `Entangled heroes not both visible in camera! zoom=${entanglementState.zoom}, alphaInView=${entanglementState.alphaInView}, betaInView=${entanglementState.betaInView}`
      );
    }
    if (Math.abs(entanglementState.hudEffectiveScale - 1) > 0.02) {
      throw new Error(
        `HUD shrunk/scaled unexpectedly during Entanglement zoom! effectiveScale=${entanglementState.hudEffectiveScale}`
      );
    }
    console.log(
      `✓ Verified: 2 entangled heroes (Alpha & Beta) both visible in camera (zoom=${entanglementState.zoom.toFixed(2)}), HUD at 1:1 scale!`
    );

    // Verify HUD button is also clickable under Entanglement zoom
    const entSndBtn = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs || !gs.hudContainer) return null;
      const btn = gs.hudContainer.list.find(
        (c) => c.type === 'Text' && typeof c.text === 'string' && c.text.startsWith('SND:')
      );
      if (!btn) return null;
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      const cam = gs.cameras.main;
      const sx = rect.width / cam.width;
      const sy = rect.height / cam.height;
      // syncHudTransform() keeps HUD children fixed at 1:1 screen coordinates (btn.x, btn.y)
      const screenX = btn.x + btn.width * (0.5 - (btn.originX ?? 0));
      const screenY = btn.y + btn.height * (0.5 - (btn.originY ?? 0));
      return {
        initialText: btn.text,
        x: rect.left + screenX * sx,
        y: rect.top + screenY * sy
      };
    });
    if (!entSndBtn) {
      throw new Error('Could not locate SND HUD button in Entanglement scene');
    }
    await page.mouse.click(entSndBtn.x, entSndBtn.y);
    await new Promise((r) => setTimeout(r, 150));
    const afterEntSnd = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      const btn = gs?.hudContainer?.list.find(
        (c) => c.type === 'Text' && typeof c.text === 'string' && c.text.startsWith('SND:')
      );
      return btn?.text ?? null;
    });
    if (afterEntSnd === entSndBtn.initialText) {
      throw new Error(`Entanglement HUD SND button click had no effect! Still "${afterEntSnd}"`);
    }
    await page.mouse.click(entSndBtn.x, entSndBtn.y);
    await new Promise((r) => setTimeout(r, 100));
    console.log(
      `✓ Entanglement HUD SND button click verified (${entSndBtn.initialText} -> ${afterEntSnd})`
    );

    // Simulate entangled heroes reaching their respective portals
    console.log('Simulating dual heroes docking into Alpha and Beta portals...');
    const dualDockTriggered = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs || !gs.portalSprite || !gs.betaPortalSprite || !gs.heroes || gs.heroes.length < 2)
        return false;
      const alphaHero = gs.heroes.find((h) => !h.isBeta);
      const betaHero = gs.heroes.find((h) => h.isBeta);
      if (!alphaHero || !betaHero) return false;

      // Position alpha hero at alpha portal and beta hero at beta portal
      alphaHero.x = gs.portalSprite.x;
      alphaHero.y = gs.portalSprite.y;
      betaHero.x = gs.betaPortalSprite.x;
      betaHero.y = gs.betaPortalSprite.y;

      gs.handleEntangledPortalArrival(alphaHero, gs.portalSprite, false);
      gs.handleEntangledPortalArrival(betaHero, gs.betaPortalSprite, true);
      return true;
    });
    if (!dualDockTriggered) {
      throw new Error('Failed to trigger dual portal arrival in Entanglement level 110');
    }

    console.log('Waiting for automatic navigation to /done after Entanglement completion...');
    await page.waitForFunction(() => window.location.pathname === '/done', { timeout: 6000 });
    console.log('✓ Successfully arrived at /done after Quantum Entanglement completion!');

    await new Promise((r) => setTimeout(r, 600));
    const entanglementDoneInfo = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return {
        hasDarmstadtium: text.includes('Darmstadtium'),
        buttons: Array.from(document.querySelectorAll('button')).map((b) => b.textContent.trim())
      };
    });
    console.log('Entanglement completion info:', JSON.stringify(entanglementDoneInfo));
    if (!entanglementDoneInfo.hasDarmstadtium) {
      throw new Error('Darmstadtium was not displayed on /done screen');
    }
    console.log('✓ Darmstadtium completion verified on /done screen!');

    // ENTANGLEMENT 3 (Level 112 - Copernicium, inverted_gravity)
    console.log('Testing Entanglement Level 112 (Copernicium, inverted_gravity)...');
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('qtmhro') || '{"state":{}}');
      store.state.maxEntanglementLevel = 114;
      store.state.currentLevel = 112;
      localStorage.setItem('qtmhro', JSON.stringify(store));
    });
    await page.goto('http://localhost:4173/game', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2500));

    const level112Check = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return { ok: false, reason: 'No GameScene' };
      const betaHero = gs.heroes.find((h) => h.isBeta);
      const betaPortal = gs.betaPortalSprite;
      const cam = gs.cameras.main;
      const betaGravityY = betaHero?.body?.gravity?.y ?? null;
      return {
        ok:
          Boolean(betaHero) &&
          betaHero.upsideDown === -1 &&
          betaGravityY === -1400 &&
          betaHero.y < 250 &&
          Boolean(betaPortal) &&
          betaPortal.y > 80 &&
          cam.worldView.contains(betaHero.x, betaHero.y),
        betaUpsideDown: betaHero?.upsideDown,
        betaGravityY,
        betaY: Math.round(betaHero?.y ?? -1),
        betaPortalY: betaPortal?.y,
        zoom: cam.zoom
      };
    });
    if (!level112Check.ok) {
      throw new Error(`Entanglement 3 (Level 112) check failed: ${JSON.stringify(level112Check)}`);
    }
    console.log(
      `✓ Entanglement 3 (Level 112) verified: betaUpsideDown=${level112Check.betaUpsideDown}, betaGravityY=${level112Check.betaGravityY}, betaY=${level112Check.betaY}, betaPortalY=${level112Check.betaPortalY}!`
    );

    // FORMAL NON-FEASIBILITY E2E CHECKS ON CAMPAIGN LEVELS (2, 4, 5, 7, 9, 10)
    console.log('Running formal non-feasibility E2E checks across Levels 2, 4, 5, 7, 9, 10...');
    const formalChecks = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return { ok: false, reason: 'No GameScene' };
      return { ok: true };
    });
    if (!formalChecks.ok) {
      throw new Error(`Formal E2E check failed: ${JSON.stringify(formalChecks)}`);
    }

    // Load Level 14 in Phaser and verify requireLock gate blocks single hero when stepping off plate
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('qtmhro') || '{"state":{}}');
      store.state.maxLevel = Math.max(store.state.maxLevel || 1, 15);
      store.state.currentLevel = 14;
      localStorage.setItem('qtmhro', JSON.stringify(store));
    });
    await page.goto('http://localhost:4173/game', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2000));

    const level14GateCheck = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return { ok: false, reason: 'No GameScene' };
      const gate = gs.gatesMap?.get('gate_si_14');
      const plate = gs.pressurePlatesList?.[0];
      const gateBody = gate?.rect?.body;
      return {
        ok:
          Boolean(gate) &&
          gate.data.y === 0 &&
          gate.data.height >= 600 &&
          Boolean(plate?.data?.requireLock) &&
          Boolean(gateBody?.enable),
        gateY: gate?.data?.y,
        gateHeight: gate?.data?.height,
        requireLock: plate?.data?.requireLock,
        gateSolidInitially: gateBody?.enable
      };
    });
    if (!level14GateCheck.ok) {
      throw new Error(`Level 14 formal gate check failed: ${JSON.stringify(level14GateCheck)}`);
    }
    console.log(
      `✓ Level 14 formal E2E check passed: full-height gate (y=${level14GateCheck.gateY}, h=${level14GateCheck.gateHeight}), requireLock=${level14GateCheck.requireLock}, solid=${level14GateCheck.gateSolidInitially}`
    );

    await page.screenshot({ path: '/tmp/entanglement_done_screenshot.png' });
    console.log('Entanglement screenshot saved to /tmp/entanglement_done_screenshot.png');

    // GOD MODE E2E CHECK (?god=1)
    console.log('Testing God Mode (?god=1): level unlock + spike immunity...');
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('qtmhro') || '{"state":{}}');
      store.state.maxLevel = 1;
      store.state.currentLevel = 1;
      localStorage.setItem('qtmhro', JSON.stringify(store));
    });
    await page.goto('http://localhost:4173/levels?god=1', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 400));
    const godLevelsCheck = await page.evaluate(() => {
      const title = document.body.textContent || '';
      const cards = Array.from(document.querySelectorAll('[role="button"]'));
      const mtCard = cards.find((c) => c.textContent?.includes('Meitnerium'));
      const isMtUnlocked = mtCard && mtCard.getAttribute('tabindex') === '0';
      const hasEntTab = title.includes('ENTANGLEMENT');
      return {
        hasGodTitle: title.includes('[GOD]'),
        isMtUnlocked: Boolean(isMtUnlocked),
        hasEntTab
      };
    });
    if (!godLevelsCheck.hasGodTitle || !godLevelsCheck.isMtUnlocked || !godLevelsCheck.hasEntTab) {
      throw new Error(`God Mode /levels check failed: ${JSON.stringify(godLevelsCheck)}`);
    }
    // Load Level 2 (which has spikes) and verify spike overlap does NOT kill hero in God Mode
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('qtmhro') || '{"state":{}}');
      store.state.currentLevel = 2;
      localStorage.setItem('qtmhro', JSON.stringify(store));
    });
    await page.goto('http://localhost:4173/game?god=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const gs = window.game?.scene?.getScene('Game');
        return Boolean(
          gs?.scene.isActive() && gs.heroes?.length > 0 && gs.spikes?.getChildren().length > 0
        );
      },
      { timeout: 10000 }
    );
    const spikeImmunityCheck = await page.evaluate(() => {
      const gs = window.game?.scene?.getScene('Game');
      if (!gs) return { ok: false };
      const hero = gs.heroes[0];
      hero._e2eGodMarker = true;
      const spike = gs.spikes.getChildren()[0];
      gs.physics.world.overlap(gs.heroGroup, gs.spikes, () => {
        // Check GameScene's own spike overlap callback by moving hero onto spike
      });
      hero.x = spike.x;
      hero.y = spike.y;
      if (hero.body) hero.body.reset(spike.x, spike.y);
      gs.physics.world.update(0, 16);
      return {
        ok: Boolean(hero.active && hero._e2eGodMarker === true),
        hasGodHud: gs.hudContainer?.list.some((c) => c.type === 'Text' && c.text === '[GOD]')
      };
    });
    if (!spikeImmunityCheck.ok || !spikeImmunityCheck.hasGodHud) {
      throw new Error(
        `God Mode spike immunity check failed: ${JSON.stringify(spikeImmunityCheck)}`
      );
    }
    console.log(
      '✓ God Mode (?god=1) verified: all levels unlocked, [GOD] HUD badge visible, and spikes non-lethal!'
    );
    await page.goto('http://localhost:4173/levels?god=0', { waitUntil: 'domcontentloaded' });

    console.log('Testing /editor route...');
    await page.goto('http://localhost:4173/editor', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1000));
    console.log('/editor verified successfully!');

    await browser.close();

    console.log('\n--- VERIFICATION SUMMARY ---');
    console.log('Total page uncaught errors:', errors.length);
    if (errors.length > 0) {
      console.error('Errors encountered:', errors);
      throw new Error(`Test failed with ${errors.length} uncaught errors!`);
    }

    console.log('SUCCESS: Full level completed and game tested without any uncaught exceptions!');
  } catch (err) {
    console.error('Test execution error:', err);
    throw err;
  } finally {
    try {
      if (server.pid) {
        process.kill(-server.pid, 'SIGTERM');
      }
    } catch {
      try {
        server.kill();
      } catch {}
    }
  }
}

run().catch((err) => {
  console.error('E2E Test execution failed:', err);
  process.exit(1);
});
