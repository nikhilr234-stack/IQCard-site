import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../public/customize/index.html', import.meta.url), 'utf8');
const between = (start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
const setter = between('  function setConfiguration(patch)', '  const corePalette');
const coreEvents = between("  document.querySelectorAll('[data-core]').forEach(button => button.addEventListener", "  document.getElementById('nameInput').addEventListener");
const materialSetter = between('  function setMaterial(m)', '  function setCustomColor');
const textStyle = between('    applyCraftTextStyle(ctx,config){', '    drawLogo(');

test('core selection determines rendered name colour across every surface and switching back', () => {
  const clicks = {};
  const configuration = { core: 'black', material: 'White', identity: { tone: 'dark' }, craft: 'engrave' };
  let renderedColour;
  const renderer = runInNewContext(`({${textStyle}})`);
  const context = {
    configuration,
    document: { querySelectorAll: () => ['white', 'black'].map(core => ({
      dataset: { core }, addEventListener: (_, callback) => { clicks[core] = callback; }
    })) },
    renderCard(config) { const ctx = {}; renderer.applyCraftTextStyle(ctx, config); renderedColour = ctx.fillStyle; },
    renderControls() {}, updateFinalCaption() {}, triggerMaterialFlash() {}, triggerInspectionSweep() {}
  };
  runInNewContext(`${setter}\n${materialSetter}\n${coreEvents}`, context);
  for (const [core, expected] of [['white', '#ffffff'], ['black', '#000000'], ['white', '#ffffff']]) {
    clicks[core]();
    assert.equal(renderedColour, expected, `${core} core must update the name immediately`);
    for (const name of ['White', 'Black', 'Graphite', 'Terracotta', 'Mustard', 'Oxblood', 'Walnut', 'Natural Oak', 'Travertine', 'Concrete', 'Ivory Marble', 'Oxidised Steel']) {
      context.setMaterial({ name });
      assert.equal(renderedColour, expected, `${core} core on ${name}`);
    }
  }
});
