// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// CONNECTORS (2026-10-20): the best known MCP servers, checked against MADRE, one press each.
//
// Each one is an address its maker publishes, and adding it is exactly what a person does by hand in
// Settings › Outside tools (MCP): MADRE saves it, starts it and reads its tools before any agent gets
// it (src/modules/mcp-connect.mjs). Nothing here reaches anything by itself; the page lists them.
//
// `checked` says how far MADRE went with each one, on the date in CATALOG_CHECKED, and the page says
// it in those words and no further:
//   'tools'   no account needed: MADRE connected, did the MCP handshake and read its tools;
//   'signin'  with your account: MADRE found its sign-in (OAuth, with registration of new apps open),
//             which is the part MADRE does; the tools are read the moment you sign in;
//   'token'   with a token you make on its page: MADRE checks it as soon as you paste it.
// Asana and HubSpot answered that they only accept apps they already know; they are left out until
// they do. Every name below is its maker's; the tiles show initials, not their marks.

export const CATALOG_CHECKED = '2026-10-20';

export const MCP_GROUPS = [
  { id: 'docs', title: 'Docs and code', about: 'No account: they answer the moment you connect them.' },
  { id: 'work', title: 'Work and projects', about: 'With your account: you sign in on their own page.' },
  { id: 'dev', title: 'Build and ship', about: 'Errors, deploys and databases, with your account.' },
  { id: 'business', title: 'Payments and sites', about: 'Your store, your payments and your sites, with your account.' },
];

export const MCP_CATALOG = [
  { id: 'context7', label: 'Context7', maker: 'Upstash', group: 'docs', hue: '#10b981', url: 'https://mcp.context7.com/mcp', auth: 'none', checked: 'tools', about: 'Up-to-date docs for the libraries your project uses, so the agents do not code from memory.' },
  { id: 'deepwiki', label: 'DeepWiki', maker: 'Cognition', group: 'docs', hue: '#6366f1', url: 'https://mcp.deepwiki.com/mcp', auth: 'none', checked: 'tools', about: 'Ask about any public GitHub repository and read how it is built.' },
  { id: 'mslearn', label: 'Microsoft Learn', maker: 'Microsoft', group: 'docs', hue: '#0ea5e9', url: 'https://learn.microsoft.com/api/mcp', auth: 'none', checked: 'tools', about: 'The official docs and code samples of Microsoft and Azure.' },
  { id: 'cfdocs', label: 'Cloudflare Docs', maker: 'Cloudflare', group: 'docs', hue: '#f97316', url: 'https://docs.mcp.cloudflare.com/mcp', auth: 'none', checked: 'tools', about: 'Searches the Cloudflare documentation: Workers, Pages, R2 and the rest.' },
  { id: 'huggingface', label: 'Hugging Face', maker: 'Hugging Face', group: 'docs', hue: '#eab308', url: 'https://huggingface.co/mcp', auth: 'none', checked: 'tools', about: 'Finds models, datasets and spaces on the Hugging Face Hub.' },
  { id: 'notion', label: 'Notion', maker: 'Notion', group: 'work', hue: '#a3a3a3', url: 'https://mcp.notion.com/mcp', auth: 'oauth', checked: 'signin', about: 'Your pages and databases: the agents read them and write into them.' },
  { id: 'linear', label: 'Linear', maker: 'Linear', group: 'work', hue: '#818cf8', url: 'https://mcp.linear.app/mcp', auth: 'oauth', checked: 'signin', about: 'Issues, projects and cycles: look them up, create them and move them.' },
  { id: 'atlassian', label: 'Jira · Confluence', maker: 'Atlassian', group: 'work', hue: '#3b82f6', url: 'https://mcp.atlassian.com/v1/mcp', auth: 'oauth', checked: 'signin', about: 'Your Jira tickets and Confluence pages, in the conversation.' },
  { id: 'monday', label: 'monday.com', maker: 'monday.com', group: 'work', hue: '#f43f5e', url: 'https://mcp.monday.com/mcp', auth: 'oauth', checked: 'signin', about: 'Your boards and items: read them and update them.' },
  { id: 'zapier', label: 'Zapier', maker: 'Zapier', group: 'work', hue: '#fb923c', url: 'https://mcp.zapier.com/api/mcp/mcp', auth: 'oauth', checked: 'signin', about: 'Thousands of apps through the actions you choose in Zapier.' },
  { id: 'sentry', label: 'Sentry', maker: 'Sentry', group: 'dev', hue: '#8b5cf6', url: 'https://mcp.sentry.dev/mcp', auth: 'oauth', checked: 'signin', about: 'The errors your app had in production, with what caused them.' },
  { id: 'vercel', label: 'Vercel', maker: 'Vercel', group: 'dev', hue: '#e5e5e5', url: 'https://mcp.vercel.com', auth: 'oauth', checked: 'signin', about: 'Your projects, deploys and their logs.' },
  { id: 'netlify', label: 'Netlify', maker: 'Netlify', group: 'dev', hue: '#14b8a6', url: 'https://mcp.netlify.com/mcp', auth: 'oauth', checked: 'signin', about: 'Create, deploy and manage your Netlify sites.' },
  { id: 'supabase', label: 'Supabase', maker: 'Supabase', group: 'dev', hue: '#22c55e', url: 'https://mcp.supabase.com/mcp', auth: 'oauth', checked: 'signin', about: 'Your database, its tables and migrations, and your project settings.' },
  { id: 'cloudflare', label: 'Cloudflare', maker: 'Cloudflare', group: 'dev', hue: '#f59e0b', url: 'https://bindings.mcp.cloudflare.com/mcp', auth: 'oauth', checked: 'signin', about: 'Your Workers, KV, R2 and D1, from the conversation.' },
  { id: 'github', label: 'GitHub', maker: 'GitHub', group: 'dev', hue: '#94a3b8', url: 'https://api.githubcopilot.com/mcp/', auth: 'token', checked: 'token', tokenAt: 'https://github.com/settings/personal-access-tokens/new', about: 'Repositories, issues, pull requests and Actions, with a token you make on GitHub.' },
  { id: 'stripe', label: 'Stripe', maker: 'Stripe', group: 'business', hue: '#635bff', url: 'https://mcp.stripe.com', auth: 'oauth', checked: 'signin', about: 'Customers, payments, products and invoices of your Stripe account.' },
  { id: 'paypal', label: 'PayPal', maker: 'PayPal', group: 'business', hue: '#2563eb', url: 'https://mcp.paypal.com/mcp', auth: 'oauth', checked: 'signin', about: 'Invoices, orders and transactions of your PayPal account.' },
  { id: 'square', label: 'Square', maker: 'Block', group: 'business', hue: '#737373', url: 'https://mcp.squareup.com/mcp', auth: 'oauth', checked: 'signin', about: 'Your Square catalog, orders and payments.' },
  { id: 'canva', label: 'Canva', maker: 'Canva', group: 'business', hue: '#06b6d4', url: 'https://mcp.canva.com/mcp', auth: 'oauth', checked: 'signin', about: 'Find, create and export your Canva designs.' },
  { id: 'webflow', label: 'Webflow', maker: 'Webflow', group: 'business', hue: '#4f46e5', url: 'https://mcp.webflow.com/mcp', auth: 'oauth', checked: 'signin', about: 'Your Webflow sites, their pages and CMS collections.' },
  { id: 'wix', label: 'Wix', maker: 'Wix', group: 'business', hue: '#a855f7', url: 'https://mcp.wix.com/mcp', auth: 'oauth', checked: 'signin', about: 'Your Wix sites and what they sell.' },
];

// The tile's two letters: the label's words, or its first two letters.
export const initials = (label) => {
  const words = String(label).split(/[\s.]+/).filter(Boolean);
  return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : `${words[0][0].toUpperCase()}${words[0][1] ?? ''}`;
};
