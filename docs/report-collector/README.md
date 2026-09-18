# MADRE report collector

Un Worker de Cloudflare que recibe los reportes del sentinel de MADRE y los convierte en issues de GitHub. Sin base de datos: un issue por huella, y comentarios cuando la misma huella vuelve.

```
npm create cloudflare@latest madre-reports -- --type hello-world
cp worker.mjs madre-reports/src/index.js
cd madre-reports
npx wrangler secret put GITHUB_TOKEN      # token con permiso de issues en el repo
npx wrangler secret put GITHUB_REPO       # jossuealcacao-exe/madre
npx wrangler deploy
```

Luego, en la máquina que reporta:

```
PULSE_REPORT_URL=https://madre-reports.<cuenta>.workers.dev/v1/reports madre start
```

o en `~/.pulse/config.json`: `{ "telemetry": { "reportUrl": "https://…/v1/reports", "autoReport": true } }`. Con la URL puesta, MU/TH/UR muestra `SEND` en cada reporte y el interruptor `AUTO-REPORT`.
