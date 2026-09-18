# MADRE report collector

Un Worker de Cloudflare que recibe los reportes del sentinel de MADRE y los convierte en issues de GitHub. Sin base de datos: un issue por huella, y un comentario cuando la misma huella vuelve. La carpeta ya trae `wrangler.toml`, así que se despliega desde aquí.

## Despliegue

1. Token de GitHub: en https://github.com/settings/personal-access-tokens/new crea un token *fine-grained* con acceso solo al repositorio `jossuealcacao-exe/madre` y permiso **Issues: Read and write**. Cópialo.

2. Desde esta carpeta:

```
cd docs/report-collector
npx wrangler login                 # abre el navegador; crea la cuenta de Cloudflare si no tienes (plan gratuito)
npx wrangler secret put GITHUB_TOKEN   # pega el token
npx wrangler secret put GITHUB_REPO    # jossuealcacao-exe/madre
npx wrangler deploy
```

`deploy` imprime la URL del worker, por ejemplo `https://madre-reports.<cuenta>.workers.dev`. El endpoint es esa URL más `/v1/reports`.

3. Prueba desde la terminal:

```
curl -X POST https://madre-reports.<cuenta>.workers.dev/v1/reports \
  -H 'content-type: application/json' \
  -d '{"kind":"unknown","fingerprint":"abcdef123456","agent":"codex","error":"prueba del colector","madre":"0.2.0","node":"v22","platform":"test","agents":[],"at":"2026-09-18T00:00:00Z","count":1}'
```

Debe responder `{"ok":true,"issue":N,"action":"created"}` y aparecer un issue con etiqueta `sentinel` en el repo. Bórralo después.

## Conectar MADRE

En la máquina que reporta, cualquiera de las dos:

```
PULSE_REPORT_URL=https://madre-reports.<cuenta>.workers.dev/v1/reports madre start
```

o en `~/.pulse/config.json`:

```
{ "telemetry": { "reportUrl": "https://madre-reports.<cuenta>.workers.dev/v1/reports", "autoReport": true } }
```

Con la URL puesta, MU/TH/UR muestra `SEND` en cada reporte y el interruptor `AUTO-REPORT`. Para que los usuarios de MADRE reporten sin configurar nada, fija la URL como valor por defecto de `reportUrl` en `src/server.mjs` antes de publicar 0.2.1; el interruptor seguirá apagado hasta que cada usuario lo encienda.

## Límites del plan gratuito

100 000 peticiones al día, de sobra. El worker rechaza cuerpos de más de 32 KB y cualquier cosa que no tenga la forma de un reporte del sentinel.
