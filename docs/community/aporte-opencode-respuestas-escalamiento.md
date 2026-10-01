# Insumo @opencode · respuestas y escalamiento para la guía de comunidad

Material para que @codex consolide; no es la guía final. **Hecho** significa que la respuesta está respaldada por los archivos públicos citados. **Inferencia** debe nombrarse como tal y nunca sustituir una decisión abierta.

## Respuestas buenas, compactas

**¿Qué es MADRE?**  
MADRE reúne Codex, Claude Code, Gemini CLI y OpenCode en una sala local con conversación y memoria compartidas. Lee por defecto; los permisos de cada mensaje determinan cuándo puede crear, editar o ejecutar. (`README.md:19-29,57-70`)

**¿Mis datos nunca salen de mi máquina?**  
No exactamente. MADRE no tiene nube propia, pero lo que lee cada agente viaja a su proveedor. Además, consulta npm una vez al día salvo que la desactives; los reportes automáticos están apagados por defecto. (`docs/REFERENCE.md:197-203`)

**¿Qué diferencia hay entre `#2` y `#3`?**  
`#2 CREATE` añade archivos nuevos y restaura cualquier cambio sobre archivos previos. `#3 CONTROL` permite editar el proyecto, con checkpoint y `UNDO`. (`docs/REFERENCE.md:68-78`)

**¿MADRE guarda mis llaves?**  
No conserva copia: escribe cada llave donde la CLI correspondiente la busca, con el archivo restringido al usuario. Si observas una exposición, trátala como un reporte de seguridad privado. (`README.md:82-86`; `SECURITY.md:5-12`)

**¿Funciona en Windows?**  
El proyecto no declara todavía soporte ni no-soporte de Windows. El puerto tiene su estado y decisiones abiertas en `docs/WINDOWS.md`; no corresponde recomendar Windows nativo o WSL2 mientras `D-001` siga abierta. (`docs/WINDOWS.md:9-13,114-123`)

**¿Cuál es la versión más reciente?**  
Una versión solo se considera cerrada cuando está en npm. Comprueba tu instalación con `madre doctor` y el estado publicado en npm; una sección “Sin publicar” del changelog aún no es una versión publicada. (`CHANGELOG.md:3-7`; `CONTRIBUTING.md:72-77`)

**¿Cómo diagnostico un fallo?**  
Ejecuta `madre doctor --json` y conserva la versión, plataforma, agente, modo y la reproducción mínima. Puedes abrir el reporte desde `✎ FEEDBACK` o en issues; si afecta el aislamiento, la memoria entre salas o un envío no autorizado, usa el canal privado de seguridad. (`README.md:110,132`; `SECURITY.md:5-12`)

**¿“Entrenar MADRE” significa configurar este GPT?**  
No. En la documentación significa exportar la memoria de una sala con `madre dataset`, entrenar fuera de MADRE y servir el modelo con Ollama. Debe evaluarse antes de confiar en él. (`docs/training/README.md:1-15,45-47`)

## Respuestas que deben evitarse

| Evitar | Problema | Sustituir por |
|---|---|---|
| “Nada sale nunca de tu máquina.” | Omite el proveedor de cada CLI y los dos envíos propios. | Nombrar por separado tráfico de agentes, consulta de versión y sentinel. |
| “MADRE es compatible/incompatible con Windows.” | Cierra una decisión que el proyecto mantiene abierta. | Repetir la postura vigente y enlazar `docs/WINDOWS.md`. |
| “Activa `#3`; es completamente seguro.” | Promete más que el modelo de seguridad. | Explicar checkpoint, `UNDO`, zonas protegidas y riesgo de `#4`. |
| “Usa `PULSE_*`…” con un nombre no documentado. | Inventa una interfaz plausible. | Citar solo variables de `docs/REFERENCE.md:223-246`; si no aparece, decir que no está documentada. |
| “La próxima versión traerá X en tal fecha.” | Convierte roadmap en compromiso. | Separar lo publicado, lo no publicado y lo previsto sin fecha. |
| “Tu problema es de autenticación.” | Diagnostica una máquina que no se inspeccionó. | Pedir la salida redactada de `madre doctor --json` y una reproducción mínima. |
| “Publica aquí el prompt, la llave o el ledger completo.” | Puede exponer secretos o memoria privada. | Pedir solo datos mínimos y redactados; una vulnerabilidad va por canal privado. |
| “MADRE cuesta/no cuesta X” o “este plan alcanza.” | Precios y planes de proveedores no están fijados en el corpus. | Explicar que cada CLI usa su propia cuenta y límites, sin cotizar. |
| “Te recomiendo WSL2.” | `D-001` sigue abierta. | Decir que no hay recomendación oficial todavía. |

## Protocolo de escalamiento hacia el humano

1. **Clasificar antes de responder.** Separar hecho documentado, inferencia y dato ausente. Resolver directamente solo lo primero; presentar una inferencia como hipótesis, nunca como postura del proyecto.
2. **Seguridad: privado y prioritario.** Si permite escribir fuera del lease, conservar CONTROL, leer otra sala o enviar algo no autorizado, no pedir detalles sensibles en público. Remitir al security advisory privado o al contacto de `SECURITY.md`, solicitando versión, plataforma, agente, modo y reproducción mínima redactada. (`SECURITY.md:5-12`)
3. **Bug reproducible de MADRE.** Remitir a `✎ FEEDBACK` o issues. Pedir `madre doctor --json`, plataforma, agente, modo, resultado esperado, resultado real y pasos mínimos; nunca credenciales ni el ledger completo. (`README.md:132`; `SECURITY.md:12`)
4. **Comportamiento propio de una CLI.** Aclarar el límite y dirigir al proyecto de esa CLI; `SECURITY.md` establece que esos reportes se reenvían allí. (`SECURITY.md:12`)
5. **Decisión, idea o pregunta abierta.** No decidir por el proyecto. Remitir a un issue con etiqueta `question` o a `✎ FEEDBACK`, indicando qué documento deja el punto abierto. (`CONTRIBUTING.md:79`)
6. **Licencia, política, precios, fechas o compromisos oficiales.** Si la respuesta no está literalmente en los archivos públicos, decir “no está definido en la documentación pública” y pedir confirmación humana; no completar el vacío por inferencia.
7. **Contradicción o documentación posiblemente vencida.** Citar ambos pasajes, describir la contradicción sin elegir ganador y escalarla al humano para corregir la fuente. Para estado de versión, distinguir siempre npm de “Sin publicar”.

Formato mínimo al escalar:

> **Hecho:** [qué sí consta, con `archivo:línea`].  
> **Falta confirmar:** [una pregunta concreta].  
> **Canal:** [security advisory privado / `✎ FEEDBACK` / issue `question` / responsable humano].
