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
    cwd: '/home/antigravity/QuanticHero',
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
      if (window.game) {
        return {
          hasGame: true,
          currentState: window.game.state.current,
          heroesCount: window.game.global ? (window.game.global.heroes || []).length : null,
          portalKey: window.game.cache.checkImageKey('portal')
        };
      }
      return { hasGame: false };
    });
    console.log('Game state evaluation:', JSON.stringify(gameState, null, 2));

    await page.screenshot({ path: '/tmp/gameplay_screenshot.png' });
    console.log('Screenshot saved to /tmp/gameplay_screenshot.png');

    console.log('Testing /levels route...');
    await page.goto('http://localhost:4173/levels', { waitUntil: 'networkidle2' });
    const levelTitle = await page.evaluate(() => document.body.textContent);
    if (!levelTitle.includes('Level Selection')) {
      throw new Error('/levels page did not load "Level Selection"');
    }
    console.log('/levels verified successfully!');

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
