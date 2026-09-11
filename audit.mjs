import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/private/tmp/claude-501/-Users-jonasclaesson-git-ee-conference-app/2f8967e0-29ae-4ad1-8298-7049c730b3d5/scratchpad/shots';
const BASE = 'http://localhost:5173';

const routes = [
  ['home', '/'],
  ['schedule-grid', '/schedule?view=grid'],
  ['schedule-list', '/schedule?view=list'],
  ['session-full', '/sessions/12'],
  ['session-avail', '/sessions/7'],
  ['speakers', '/speakers'],
  ['speaker-1', '/speakers/1'],
  ['my-agenda', '/my-agenda'],
  ['venues', '/venues'],
  ['food', '/food'],
  ['expo', '/expo'],
  ['coc', '/code-of-conduct'],
  ['a11y', '/accessibility'],
  ['bogus', '/this-page-does-not-exist'],
];

const user = process.argv[2] || '1';
const vp = process.argv[3] || 'desktop';
const size = vp === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: vp==='mobile', hasTouch: vp==='mobile' });
await ctx.addInitScript((u) => { localStorage.setItem('orbit:currentUserId', u); }, user);
const page = await ctx.newPage();
const report = {};

for (const [name, path] of routes) {
  const errs = [];
  const onMsg = m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); };
  const onErr = e => errs.push('PAGEERROR ' + e.message.slice(0,200));
  page.on('console', onMsg); page.on('pageerror', onErr);
  const resp = await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(e=>({err:e.message}));
  await page.waitForTimeout(700);
  const file = `${OUT}/${vp}-u${user}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  const info = await page.evaluate(() => {
    const de = document.documentElement;
    return {
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map(h=>h.innerText.trim()).slice(0,3),
      overflow: de.scrollWidth > de.clientWidth ? `${de.scrollWidth}>${de.clientWidth}` : null,
      height: de.scrollHeight,
      unlabeledIconBtns: [...document.querySelectorAll('button,a[role=button]')].filter(b=>!b.innerText.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')).length,
      buttons: [...document.querySelectorAll('button')].map(b=>b.innerText.trim()||('[icon]'+(b.getAttribute('aria-label')||'NOLABEL'))).slice(0,40),
      textLen: document.body.innerText.length,
    };
  });
  report[name] = { path, status: resp && resp.status ? resp.status() : resp, errs, ...info };
  page.off('console', onMsg); page.off('pageerror', onErr);
  console.log(vp, 'u'+user, name.padEnd(16), info.title.slice(0,50).padEnd(50), 'ovf:'+info.overflow, 'errs:'+errs.length, errs.slice(0,2).join(' | '));
}
fs.writeFileSync(`${OUT}/../report-${vp}-u${user}.json`, JSON.stringify(report,null,1));
await browser.close();
