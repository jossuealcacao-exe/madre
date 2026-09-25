// RIPLEY: the file viewer renders HTML, SVG and Markdown inside a sealed frame.
// A switch in config.json, read live by the preview route.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

export default defineModule({
  id: 'ripley',
  name: 'RIPLEY',
  vendor: 'MADRE · PREVIEW',
  version: '1.0.0',
  summary: 'Renders HTML, SVG and Markdown from the project and from .pulse/out in the file viewer, inside a sealed frame.',
  creates: ['nothing in the project', 'a switch in ~/.pulse/config.json', 'scripts run in the frame \u00b7 nothing leaves, nothing is stored, nothing reaches MADRE'],
  card: 'ripley',
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? t('on · PREVIEW in the file viewer') : t('off · files show as source') },
      install: { display: ctx.settings.enabled ? 'disable RIPLEY' : 'enable RIPLEY (config.json)', platforms: [] },
      fixed: false,
    };
  },
});
