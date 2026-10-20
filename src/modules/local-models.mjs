// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// What this computer can do with a local AI, measured and not assumed (2026-10-16).
//
// The local AI was sized for one machine: a 16 GB Mac ran a 3B model and trained a 1.5B one, and
// a 32 GB one trained a 3B. A person with a 128 GB Mac Studio or a 24 GB graphics card can run and
// train far larger models, and a person with 8 GB should not be offered what will not load. This
// reads the hardware once — the memory the model would live in and what would compute — and sets
// it against the minimums of each model size, so the room can say, model by model and feature by
// feature, what this computer runs, what it trains and what it should leave off.
//
// The minimums are deliberately conservative, for the whole computer, not the model alone:
//   · run    a 4-bit model in Ollama with an 8k window, the system and the browser still open;
//   · train  a LoRA with mlx-lm (on a 4-bit base from 3B up, QLoRA; at full precision below that).
// On a Mac the memory is unified and the GPU may use about three quarters of it; on an NVIDIA card
// what counts is its own memory (VRAM). Without either, a model still runs on the processor —
// slower — and nothing is trained: a LoRA on a processor takes days.

import { execFile } from 'node:child_process';
import { arch as osArch, cpus as osCpus, platform as osPlatform, totalmem as osTotalmem } from 'node:os';

const GB = 1024 ** 3;

// One family, every size, so a recommendation is a step up or down a single ladder and a model
// trained at one size is the same model at another. Qwen2.5 Instruct: multilingual (it answers in
// the human's language), open weights, an Ollama tag and an MLX 4-bit build at every size.
export const MODEL_TIERS = [
  { id: '0.5b', params: 0.5, label: 'Qwen2.5 0.5B', ollama: 'qwen2.5:0.5b', base: 'Qwen/Qwen2.5-0.5B-Instruct', runGb: 4, trainGb: 8 },
  { id: '1.5b', params: 1.5, label: 'Qwen2.5 1.5B', ollama: 'qwen2.5:1.5b', base: 'Qwen/Qwen2.5-1.5B-Instruct', runGb: 6, trainGb: 12 },
  { id: '3b', params: 3, label: 'Qwen2.5 3B', ollama: 'qwen2.5:3b', base: 'mlx-community/Qwen2.5-3B-Instruct-4bit', quantized: true, runGb: 8, trainGb: 16 },
  { id: '7b', params: 7, label: 'Qwen2.5 7B', ollama: 'qwen2.5:7b', base: 'mlx-community/Qwen2.5-7B-Instruct-4bit', quantized: true, runGb: 12, trainGb: 24 },
  { id: '14b', params: 14, label: 'Qwen2.5 14B', ollama: 'qwen2.5:14b', base: 'mlx-community/Qwen2.5-14B-Instruct-4bit', quantized: true, runGb: 20, trainGb: 36 },
  { id: '32b', params: 32, label: 'Qwen2.5 32B', ollama: 'qwen2.5:32b', base: 'mlx-community/Qwen2.5-32B-Instruct-4bit', quantized: true, runGb: 36, trainGb: 64 },
  { id: '72b', params: 72, label: 'Qwen2.5 72B', ollama: 'qwen2.5:72b', base: 'mlx-community/Qwen2.5-72B-Instruct-4bit', quantized: true, runGb: 64, trainGb: 128 },
];

// Other families a person may choose instead (2026-10-20). Qwen2.5 stays the ladder MADRE
// recommends and trains on; these run in Ollama with the same minimums and are only offered where
// they load. Their notes are said to a person, so they stay in plain words.
export const OTHER_MODELS = [
  { ollama: 'llama3.2:1b', label: 'Llama 3.2 1B', maker: 'Meta', params: 1, runGb: 4, note: 'The smallest. For a computer with little memory.' },
  { ollama: 'llama3.2:3b', label: 'Llama 3.2 3B', maker: 'Meta', params: 3, runGb: 8, note: 'Quick. Strongest in English.' },
  { ollama: 'gemma3:4b', label: 'Gemma 3 4B', maker: 'Google', params: 4, runGb: 8, note: 'Quick, and good in many languages.' },
  { ollama: 'mistral:7b', label: 'Mistral 7B', maker: 'Mistral AI', params: 7, runGb: 12, note: 'Balanced, for everyday work.' },
  { ollama: 'llama3.1:8b', label: 'Llama 3.1 8B', maker: 'Meta', params: 8, runGb: 12, note: 'Balanced. Strongest in English.' },
  { ollama: 'gemma3:12b', label: 'Gemma 3 12B', maker: 'Google', params: 12, runGb: 16, note: 'Careful answers in many languages.' },
  { ollama: 'phi4:14b', label: 'Phi-4 14B', maker: 'Microsoft', params: 14, runGb: 20, note: 'Reasons well for its size.' },
  { ollama: 'gemma3:27b', label: 'Gemma 3 27B', maker: 'Google', params: 27, runGb: 32, note: 'The largest of its family. Needs a lot of memory.' },
];

// What the local AI does in MADRE, and the smallest model each one is worth turning on with. Below
// it the feature works but answers poorly enough that it is better left off.
export const LOCAL_FEATURES = [
  { id: 'search', needs: null },            // search by meaning: an embedding model, ~0.3 GB
  { id: 'archivist', needs: '3b' },         // the notes it distils from each conversation
  { id: 'agent', needs: '3b' },             // @madre answering in a project
  { id: 'coordinator', needs: '7b' },       // the Coordinator answering about every project
  { id: 'train', needs: '1.5b', train: true }, // training your own model on what the project knows
];

const run = (file, args, { timeoutMs = 2500, exec = execFile } = {}) => new Promise((resolve) => {
  try {
    exec(file, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout) => resolve(error ? null : String(stdout ?? '')));
  } catch { resolve(null); }
});

// NVIDIA's own tool, if the card and its driver are there: name and memory of each card, in MiB.
export function parseNvidia(output) {
  return String(output ?? '').split('\n').map((line) => line.split(',').map((part) => part.trim())).filter(([name, mib]) => name && Number.isFinite(Number(mib)))
    .map(([name, mib]) => ({ name, vramGb: Math.round(Number(mib) / 1024) }));
}

// The hardware, read once. Everything is injectable so the reading can be tested on any machine.
export async function detectHardware({ platform = osPlatform(), arch = osArch(), totalmem = osTotalmem(), cpus = osCpus(), exec = execFile } = {}) {
  const memoryGb = Math.round(totalmem / GB);
  const cores = Array.isArray(cpus) ? cpus.length : 0;
  let chip = Array.isArray(cpus) && cpus[0]?.model ? String(cpus[0].model).trim() : null;
  if (platform === 'darwin') {
    const brand = await run('sysctl', ['-n', 'machdep.cpu.brand_string'], { exec });
    if (brand?.trim()) chip = brand.trim();
  }
  // Apple silicon: one memory for the processor and the GPU, which MLX and Ollama both use.
  if (platform === 'darwin' && arch === 'arm64') return { platform, arch, chip, cores, memoryGb, accelerator: 'apple', acceleratorGb: memoryGb, gpus: [] };
  const gpus = parseNvidia(await run('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], { exec }));
  if (gpus.length) {
    // A model lives on one card unless it is split; the largest card is what one model may count on.
    const largest = Math.max(...gpus.map((gpu) => gpu.vramGb));
    return { platform, arch, chip, cores, memoryGb, accelerator: 'nvidia', acceleratorGb: largest, gpus };
  }
  return { platform, arch, chip, cores, memoryGb, accelerator: 'cpu', acceleratorGb: 0, gpus: [] };
}

// The memory a model may count on, in the units the minimums are written in (a whole Mac's).
// A Mac's GPU takes about three quarters of the unified memory, which the minimums already allow
// for; an NVIDIA card gives the model all of its own, so its VRAM counts for a third more.
export function usableGb(hardware) {
  if (!hardware) return 0;
  if (hardware.accelerator === 'apple') return hardware.acceleratorGb;
  if (hardware.accelerator === 'nvidia') return Math.round(hardware.acceleratorGb / 0.75);
  return hardware.memoryGb;
}

// Model by model: does it run here (fast, slowly on the processor, or not), does it train here,
// and why not. Then the one to recommend for each, and what each feature of the local AI may use.
export function hardwareFit(hardware) {
  const usable = usableGb(hardware);
  const accelerated = hardware?.accelerator === 'apple' || hardware?.accelerator === 'nvidia';
  const models = MODEL_TIERS.map((tier) => {
    const runs = usable >= tier.runGb ? (accelerated ? 'yes' : 'slow') : 'no';
    const trains = accelerated && usable >= tier.trainGb ? 'yes' : 'no';
    const trainWhy = !accelerated ? 'no-accelerator' : trains === 'no' ? 'memory' : null;
    return { ...tier, run: runs, train: trains, runWhy: runs === 'no' ? 'memory' : runs === 'slow' ? 'no-accelerator' : null, trainWhy };
  });
  // Recommended: the largest that runs well, but no larger than 14B for the everyday model of a
  // project — beyond that answers come slowly enough to hold the room up. On a processor alone,
  // no larger than 3B. Training: the largest that trains, no larger than what it then runs.
  const runnable = models.filter((model) => model.run === 'yes');
  const everyday = (accelerated ? runnable.filter((model) => model.params <= 14) : models.filter((model) => model.run === 'slow' && model.params <= 3));
  const run = everyday.at(-1) ?? null;
  const trainable = models.filter((model) => model.train === 'yes' && runnable.includes(model));
  const train = trainable.at(-1) ?? null;
  const largestRun = (accelerated ? runnable : models.filter((model) => model.run === 'slow')).at(-1) ?? null;
  const order = MODEL_TIERS.map((tier) => tier.id);
  const features = LOCAL_FEATURES.map((feature) => {
    if (!feature.needs) return { id: feature.id, ok: true, needs: null };
    const at = order.indexOf(feature.needs);
    const ok = feature.train ? Boolean(train) && order.indexOf(train.id) >= at : Boolean(largestRun) && order.indexOf(largestRun.id) >= at;
    return { id: feature.id, ok, needs: feature.needs, slow: !feature.train && ok && !accelerated };
  });
  return { hardware, usableGb: usable, accelerated, models, recommended: { run, train, largestRun }, features };
}

// Every model a person may choose, each with whether it runs on this computer and which one MADRE
// recommends here: the Qwen2.5 ladder first, then the other families, smallest first.
export function modelCatalog(fit) {
  const usable = fit?.usableGb ?? 0;
  const accelerated = Boolean(fit?.accelerated);
  const best = fit?.recommended?.run?.ollama ?? null;
  const qwen = MODEL_TIERS.map((tier) => ({ ollama: tier.ollama, label: tier.label, maker: 'Alibaba', params: tier.params, runGb: tier.runGb, note: 'Good in many languages. The family MADRE recommends and trains.' }));
  return [...qwen, ...OTHER_MODELS].map((model) => ({
    ...model,
    run: usable >= model.runGb ? (accelerated ? 'yes' : 'slow') : 'no',
    recommended: model.ollama === best,
  }));
}

let measured = null;
// Read once per process: the hardware does not change under a running room.
export function hardwareOnce(options) {
  if (!measured) measured = detectHardware(options).then(hardwareFit).catch(() => hardwareFit({ accelerator: 'cpu', acceleratorGb: 0, memoryGb: 0, gpus: [] }));
  return measured;
}
