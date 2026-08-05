import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const expectedIds = ['e01', 'e14', 'e27'];
const expectedFrames = ['start', 'end'];

function yamlField(source, field) {
  const match = source.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim();
}

test('pilot manifest contains exactly three draft sequence assets with six real frames', async () => {
  const manifest = JSON.parse(await read('public/exercises/v1/manifest.json'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.status, 'draft');
  assert.deepEqual(manifest.assets.map((asset) => asset.exerciseId), expectedIds);
  assert.equal(new Set(manifest.assets.map((asset) => asset.mediaId)).size, 3);

  for (const asset of manifest.assets) {
    assert.equal(asset.type, 'sequence');
    assert.equal(asset.status, 'draft');
    assert.equal(asset.generator, 'programmatic-svg-v1');
    assert.deepEqual(asset.frames.map((frame) => frame.role), expectedFrames);
    assert.equal(asset.frames.length, 2);
    assert.ok(asset.thumbnailId);
    assert.equal(asset.review.clinical, 'pending');
    assert.equal(asset.review.visual, 'pending');
    assert.equal(asset.review.accessibility, 'pending');
    assert.equal(asset.review.productOwner, 'pending');

    for (const frame of asset.frames) {
      assert.match(frame.src, /^\/exercises\/v1\/(knee|shoulder|lumbar)\/e\d{2}\/(start|end)\.svg$/);
      assert.ok(frame.alt.length > 40);
      assert.equal(frame.width, 1200);
      assert.equal(frame.height, 900);
      assert.equal(frame.format, 'svg');
      assert.match(frame.sha256, /^[a-f0-9]{64}$/);

      const svg = await read(`public${frame.src}`);
      assert.match(svg, /^<svg /);
      assert.match(svg, /role="img"/);
      assert.match(svg, /aria-labelledby="title desc"/);
      assert.match(svg, /<title id="title">.+<\/title>/s);
      assert.match(svg, /<desc id="desc">.+<\/desc>/s);
      assert.doesNotMatch(svg, /<text\b/i, `${frame.id} must not embed visible labels`);
      assert.doesNotMatch(svg, /stroke-dasharray=/i, `${frame.id} must not embed movement-guide annotations`);
    }
  }
});

test('assisted squat frames show both hands contacting the support rail', async () => {
  for (const role of expectedFrames) {
    const svg = await read(`public/exercises/v1/knee/e01/${role}.svg`);
    assert.match(svg, /<circle cx="704" cy="360" r="16"/);
    assert.match(svg, /<circle cx="704" cy="392" r="16"/);
    assert.doesNotMatch(svg, /<circle cx="720" cy="360" r="14"/);
  }
});

test('pilot cards match manifest IDs and stay draft', async () => {
  for (const exerciseId of expectedIds) {
    const source = await read(`docs/exercises/v1/cards/${exerciseId}.yaml`);
    assert.equal(yamlField(source, 'exerciseId'), exerciseId);
    assert.equal(yamlField(source, 'mediaMode'), 'sequence');
    assert.equal(yamlField(source, 'reviewStatus'), 'draft');
    assert.match(source, /frames:\s*\n\s+- start\s*\n\s+- end/m);
    assert.match(source, /altText:\s*\n\s+start:\s+.+\n\s+end:\s+.+/m);
    assert.doesNotMatch(source, /reviewStatus:\s*approved/);
  }
});

test('production skill forbids automatic approval and mass generation', async () => {
  const skill = await read('skills/atal-exercise-asset-production/SKILL.md');
  assert.match(skill, /Never mark an asset `approved`/);
  assert.match(skill, /explicitly approved exercise IDs or batch size/);
  assert.match(skill, /same synthetic adult model/);
  assert.match(skill, /SHA-256 checksum/);
});

test('generation requests and review ledger exist for all pilot frames', async () => {
  for (const exerciseId of expectedIds) {
    const request = await read(`docs/exercises/v1/generation/${exerciseId}-request.md`);
    assert.match(request, /## Shared style lock/);
    assert.match(request, /## Start frame/);
    assert.match(request, /## End frame/);
    assert.match(request, /status after generation: `draft`/);
  }

  const heelSlideRequest = await read('docs/exercises/v1/generation/e27-request.md');
  assert.match(heelSlideRequest, /right heel remains in contact with the mat/i);
  assert.match(heelSlideRequest, /obvious at thumbnail size/i);

  const ledger = await read('docs/exercises/v1/review-ledger.md');
  for (const exerciseId of expectedIds) {
    assert.match(ledger, new RegExp(`${exerciseId} .*\\| start`));
    assert.match(ledger, new RegExp(`${exerciseId} .*\\| end`));
  }
  assert.match(ledger, /Thumbnail observability/);
  assert.doesNotMatch(ledger, /\| pass \|/);
});
