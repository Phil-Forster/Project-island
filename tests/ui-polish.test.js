const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('shared footer and achievement filters use the polished tracker standard', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  assert.equal((html.match(/class=\"filter__icon\"/g) || []).length, 4);
  assert.match(html, /project-footer__link-icon--brand/);
  assert.ok(html.includes('https://github.com/Phil-Forster/Project-island'));
  assert.ok(html.includes('philforster.co.uk'));
  assert.match(css, /Universal tracker footer \+ filter polish/);
  assert.match(css, /filter\[data-filter=\"unlocked\"\]/);
  assert.match(css, /grid-template-columns: minmax\(112px,.9fr\).*minmax\(164px,1.28fr\)/);
});
