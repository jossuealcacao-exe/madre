// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// «Your computer» (2026-10-16), the same block in a project (Modules and Settings › Local AI) and in
// Home (Settings › Local AI). Each page hands in its own row builders, so it reads like the rest.
import { t } from './i18n.js';

// What this computer can do with a local AI, measured on it (src/modules/local-models.mjs): which
// sizes run and train here, the one to use every day, and which features are worth turning on.
const LOCAL_FEATURE_NAMES = { search: 'Search by meaning', archivist: 'Archivist', agent: '@madre in the project', coordinator: 'The Coordinator with local AI', train: 'Train your own AI' };
export function hardwareLine(hw) {
  if (!hw) return t('Not measured.');
  if (hw.accelerator === 'apple') return t('{chip} · {gb} GB of shared memory', { chip: hw.chip ?? t('Apple chip'), gb: hw.memoryGb });
  if (hw.accelerator === 'nvidia') return t('{gpu} · {vram} GB of video memory · {gb} GB of memory', { gpu: hw.gpus.map((gpu) => gpu.name).join(' + '), vram: hw.acceleratorGb, gb: hw.memoryGb });
  return t('No compatible graphics card found · {gb} GB of memory', { gb: hw.memoryGb });
}
export function drawHardware(host, fit, { el, sxBlock, sxRow, sxChip }) {
  const block = sxBlock(host, t('Your computer'), t('What it can do with a local AI, measured on it. Each model has a minimum to run it and another to train it.'));
  sxRow(block, t('Hardware'), hardwareLine(fit?.hardware));
  if (!fit?.models) return block;
  const daily = fit.recommended?.run;
  sxRow(block, t('Model for every day'), daily ? t('{model} · Ollama downloads it as {tag}', { model: daily.label, tag: daily.ollama }) : t('None runs well here: the project keeps using its providers.'));
  for (const feature of fit.features ?? []) {
    const tier = fit.models.find((model) => model.id === feature.needs);
    const hint = feature.ok
      ? (feature.slow ? t('Yes, slowly: it runs on the processor.') : null)
      : feature.id === 'train'
        ? (fit.accelerated ? t('Training starts at {gb} GB.', { gb: tier.trainGb }) : t('Training needs an Apple chip or an NVIDIA card.'))
        : t('Needs at least {model}, from {gb} GB.', { model: tier.label, gb: tier.runGb });
    sxRow(block, t(LOCAL_FEATURE_NAMES[feature.id]), hint, sxChip(feature.ok ? (feature.slow ? t('Slow') : t('Yes')) : t('No'), feature.ok ? (feature.slow ? 'warn' : 'on') : ''));
  }
  const more = el('details', 'sx-more');
  more.append(el('summary', null, t('Every size, to run and to train')));
  const wrap = el('div', 'sx-table');
  const table = el('table', 'sx-models');
  const head = el('tr');
  for (const text of [t('Model'), t('To run'), t('To train'), t('Here')]) head.append(el('th', null, text));
  table.append(head);
  const verdict = (value) => (value === 'yes' ? t('runs') : value === 'slow' ? t('runs slowly') : null);
  for (const model of fit.models) {
    const row = el('tr', model.id === daily?.id ? 'pick' : null);
    const here = [verdict(model.run), model.train === 'yes' ? t('trains') : null].filter(Boolean).join(' · ') || t('does not fit');
    row.append(el('td', null, model.label), el('td', null, t('{gb} GB', { gb: model.runGb })), el('td', null, t('{gb} GB', { gb: model.trainGb })), el('td', model.run === 'no' ? 'no' : null, here));
    table.append(row);
  }
  wrap.append(table);
  more.append(wrap, el('p', 'sx-hint', t('Minimums for the whole computer, with the system and the browser open: a 4-bit model in Ollama to run it, a LoRA with mlx-lm to train it. On a Mac with an Apple chip the memory is shared; with an NVIDIA card what counts is the card\'s own.')));
  block.append(more);
  return block;
}

