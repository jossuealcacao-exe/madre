import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_TIERS, detectHardware, hardwareFit, parseNvidia, usableGb } from '../src/modules/local-models.mjs';

const GB = 1024 ** 3;
const apple = (gb) => ({ platform: 'darwin', arch: 'arm64', chip: 'Apple M', cores: 10, memoryGb: gb, accelerator: 'apple', acceleratorGb: gb, gpus: [] });
const nvidia = (vram, gb = 64) => ({ platform: 'linux', arch: 'x64', chip: 'x86', cores: 16, memoryGb: gb, accelerator: 'nvidia', acceleratorGb: vram, gpus: [{ name: 'NVIDIA GeForce RTX', vramGb: vram }] });
const cpu = (gb) => ({ platform: 'linux', arch: 'x64', chip: 'x86', cores: 8, memoryGb: gb, accelerator: 'cpu', acceleratorGb: 0, gpus: [] });
const ids = (models, key, value = 'yes') => models.filter((model) => model[key] === value).map((model) => model.id);
const feature = (fit, id) => fit.features.find((one) => one.id === id);

test('local models · every size has a minimum to run and a larger one to train, on one ladder', () => {
  assert.deepEqual(MODEL_TIERS.map((tier) => tier.id), ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b']);
  for (const [i, tier] of MODEL_TIERS.entries()) {
    assert.ok(tier.trainGb > tier.runGb, `${tier.id} trains with more than it runs with`);
    if (i) assert.ok(tier.runGb > MODEL_TIERS[i - 1].runGb && tier.trainGb >= MODEL_TIERS[i - 1].trainGb, `${tier.id} is above the one before`);
    assert.match(tier.ollama, /^qwen2\.5:/);
    // From 3B up the base trains in 4 bits (QLoRA); the recipe then fuses it back with --de-quantize.
    assert.equal(Boolean(tier.quantized), tier.params >= 3);
  }
});

test('local models · the recommendation follows the hardware, not one machine', () => {
  // 8 GB Mac: small models run, nothing worth training past 0.5B, no Coordinator.
  const small = hardwareFit(apple(8));
  assert.deepEqual(ids(small.models, 'run'), ['0.5b', '1.5b', '3b']);
  assert.equal(small.recommended.run.id, '3b');
  assert.equal(small.recommended.train.id, '0.5b');
  assert.equal(feature(small, 'train').ok, false);
  assert.equal(feature(small, 'coordinator').ok, false);
  assert.equal(feature(small, 'agent').ok, true);

  // 16 GB Mac: 7B runs, 3B trains, the Coordinator can use the local AI.
  const mid = hardwareFit(apple(16));
  assert.equal(mid.recommended.run.id, '7b');
  assert.equal(mid.recommended.train.id, '3b');
  assert.equal(feature(mid, 'coordinator').ok, true);

  // 128 GB Mac Studio: every size runs and trains; the everyday model stays at 14B so answers come quickly.
  const big = hardwareFit(apple(128));
  assert.equal(ids(big.models, 'run').length, 7);
  assert.equal(ids(big.models, 'train').length, 7);
  assert.equal(big.recommended.run.id, '14b');
  assert.equal(big.recommended.train.id, '72b');
  assert.equal(big.recommended.largestRun.id, '72b');
});

test('local models · an NVIDIA card counts its own memory, a third more than shared memory', () => {
  assert.equal(usableGb(nvidia(24)), 32);
  const fit = hardwareFit(nvidia(24));
  assert.deepEqual(ids(fit.models, 'run'), ['0.5b', '1.5b', '3b', '7b', '14b']);
  assert.equal(fit.recommended.train.id, '7b');
  assert.equal(feature(fit, 'train').ok, true);
  // The computer's own RAM does not make a small card larger.
  assert.equal(hardwareFit(nvidia(8, 128)).recommended.run.id, '3b');
});

test('local models · without an Apple chip or NVIDIA card, models run slowly and nothing trains', () => {
  const fit = hardwareFit(cpu(16));
  assert.equal(fit.accelerated, false);
  assert.deepEqual(ids(fit.models, 'run', 'slow'), ['0.5b', '1.5b', '3b', '7b']);
  assert.deepEqual(ids(fit.models, 'train'), []);
  assert.ok(fit.models.every((model) => model.trainWhy === 'no-accelerator'));
  assert.equal(fit.recommended.run.id, '3b');
  assert.equal(fit.recommended.train, null);
  assert.equal(feature(fit, 'search').ok, true);
  assert.deepEqual([feature(fit, 'agent').ok, feature(fit, 'agent').slow], [true, true]);
  assert.equal(feature(fit, 'train').ok, false);
  // Too little memory even for the smallest: nothing is offered to run.
  assert.equal(hardwareFit(cpu(2)).recommended.run, null);
});

test('local models · the hardware is read without a shell, and a missing tool means no card', async () => {
  const calls = [];
  const exec = (outputs) => (file, args, options, done) => { calls.push({ file, args, options }); const out = outputs[file]; queueMicrotask(() => (out == null ? done(new Error('ENOENT')) : done(null, out))); };
  const mac = await detectHardware({ platform: 'darwin', arch: 'arm64', totalmem: 36 * GB, cpus: [{ model: 'x' }], exec: exec({ sysctl: 'Apple M3 Pro\n' }) });
  assert.deepEqual([mac.accelerator, mac.acceleratorGb, mac.chip], ['apple', 36, 'Apple M3 Pro']);
  const linux = await detectHardware({ platform: 'linux', arch: 'x64', totalmem: 64 * GB, cpus: [{ model: 'AMD Ryzen' }], exec: exec({ 'nvidia-smi': 'NVIDIA GeForce RTX 4090, 24564\nNVIDIA GeForce RTX 3060, 12288\n' }) });
  assert.deepEqual([linux.accelerator, linux.acceleratorGb, linux.gpus.length], ['nvidia', 24, 2]);
  const plain = await detectHardware({ platform: 'linux', arch: 'x64', totalmem: 16 * GB, cpus: [], exec: exec({}) });
  assert.deepEqual([plain.accelerator, plain.memoryGb], ['cpu', 16]);
  const intelMac = await detectHardware({ platform: 'darwin', arch: 'x64', totalmem: 32 * GB, cpus: [], exec: exec({ sysctl: 'Intel(R) Core(TM) i9\n' }) });
  assert.equal(intelMac.accelerator, 'cpu');
  assert.ok(calls.every((call) => !call.options.shell && call.options.timeout > 0));
  assert.deepEqual(parseNvidia('garbage\n, \nRTX, 8192'), [{ name: 'RTX', vramGb: 8 }]);
});
