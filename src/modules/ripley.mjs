// RIPLEY: the file viewer renders HTML, SVG and Markdown inside a sealed frame.
// A switch in config.json, read live by the preview route.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

export default defineModule({
  id: 'ripley',
  name: 'RIPLEY',
  vendor: 'MADRE · PREVIEW',
  version: '1.0.0',
  summary: 'Renders HTML, SVG and Markdown from the project in the file viewer, inside a sealed frame, and opens a browser on the servers answering on this computer.',
  creates: ['nothing in the project', 'a switch in ~/.pulse/config.json', 'scripts run in the frame \u00b7 nothing leaves, nothing is stored, nothing reaches MADRE'],
  // The browser reaches loopback and nothing else until this is on. It is a separate switch from
  // RIPLEY's own because it is a separate promise: rendering a file from this project and opening
  // an address on the internet are not the same permission, and bundling them would hide the
  // second one behind the first.
  settings: { web: false },
  // No switch for the web, because the browser has no address bar to use it with. What it opens
  // is the list of servers answering on this computer, and nothing else.
  //
  // The plumbing underneath — the allow check, the framing probe, the setting itself — stays
  // because the obstacle is the medium, not the design: a page inside a browser cannot overrule
  // frame-ancestors, and a desktop MADRE with its own engine can. The day the window belongs to
  // us, the address bar comes back and this setting is what governs it.
  card: 'ripley',
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? t('on · PREVIEW in the file viewer') : t('off · files show as source') },
      install: { display: ctx.settings.enabled ? 'disable RIPLEY' : 'enable RIPLEY (config.json)', platforms: [] },
      fixed: false,
    };
  },
});
