// RIPLEY: the file viewer renders HTML, SVG and Markdown inside a sealed frame.
// A switch in config.json, read live by the preview route.

import { defineModule } from './sdk.mjs';

export default defineModule({
  id: 'ripley',
  name: 'RIPLEY',
  vendor: 'MADRE · PREVIEW',
  summary: 'Renders HTML, SVG and Markdown from the project and from .pulse/out in the file viewer, inside a sealed frame: scripts run but nothing leaves, nothing is stored, nothing reaches MADRE. Nothing leaves the room.',
  creates: ['nothing in the project', 'a ripley switch in ~/.pulse/config.json'],
  card: 'ripley',
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? 'on · PREVIEW in the file viewer' : 'off · files show as source' },
      install: { display: ctx.settings.enabled ? 'disable RIPLEY' : 'enable RIPLEY (config.json)', platforms: [] },
      fixed: false,
    };
  },
});
