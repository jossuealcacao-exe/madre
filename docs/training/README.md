# MADRE AI · entrenar el modelo del proyecto

Roadmap 2c. El proyecto exporta lo que recuerda como pares de chat; tú entrenas un modelo pequeño con ellos en tu máquina; Ollama lo sirve; `@madre` lo usa en cuanto existe. Todo local.

## 1 · Exportar

Desde **Ajustes › Lo que recuerda › Entrena tu propia IA › Exportar** (al terminar te dice en qué carpeta quedó), o en terminal:

```
npx @jossuealcala/madre dataset   # en la carpeta del proyecto
```

Escribe `~/.pulse/rooms/<proyecto>/dataset/{train.jsonl, valid.jsonl, manifest.json}`. Cada línea es `{"messages":[{role:"system"},{role:"user"},{role:"assistant"}]}`: las respuestas reales del proyecto, redactados (sin rutas, nombres, correos ni claves), más las notas resumidas como pares de recuerdo. Lo que se envió en #0 INCÓGNITO nunca está.

Cuánto hace falta: con menos de ~200 pares el modelo aprende el tono y poco más; a partir de ~1000 empieza a valer. Exporta cada tanto; el split es determinista, así que las líneas no cambian de lado.

## 2 · Entrenar (Apple Silicon, mlx-lm)

```
python3 -m venv ~/.madre-train && source ~/.madre-train/bin/activate
pip install mlx-lm
cd ~/.pulse/rooms/<proyecto>
mlx_lm.lora --model Qwen/Qwen2.5-1.5B-Instruct --train --data dataset --iters 600 --batch-size 2 --learning-rate 1e-5 --adapter-path adapters
mlx_lm.lora --model Qwen/Qwen2.5-1.5B-Instruct --adapter-path adapters --data dataset --test
```

### Linux con NVIDIA (experimental)

MLX publica un paquete para CUDA en Linux (CUDA 12, capacidad de cómputo 7.5 o mayor, controlador 550.54.14 o mayor, glibc 2.35 o mayor, Python 3.10 o mayor): <https://ml-explore.github.io/mlx/build/html/install.html>. mlx-lm solo documenta Apple silicon, así que pruébalo primero:

```
python3 -m venv ~/.madre-train && source ~/.madre-train/bin/activate
pip install "mlx[cuda12]" mlx-lm
python3 -c "import mlx.core as mx; print('CUDA:', mx.cuda.is_available())"   # debe decir True
```

Si dice `True`, los comandos de entrenamiento de arriba (desde `cd ~/.pulse/rooms/<proyecto>`) y los pasos 3 y 4 son los mismos. Si no, no hay ruta probada en Linux todavía.

`train.sh` en esta carpeta hace lo mismo con comprobaciones (`bash train.sh <carpeta del proyecto> <base>`).

### Qué tamaño entrenar

No depende de una máquina en particular, sino de la memoria de la tuya. MADRE la mide (Módulos › IA local › Tu equipo) y propone el tamaño más grande que tu computadora entrena y luego corre. Los mínimos son para la computadora completa, con el sistema y el navegador abiertos:

| Modelo | Base para entrenar | Para correrlo | Para entrenarlo |
|---|---|---|---|
| Qwen2.5 0.5B | `Qwen/Qwen2.5-0.5B-Instruct` | 4 GB | 8 GB |
| Qwen2.5 1.5B | `Qwen/Qwen2.5-1.5B-Instruct` | 6 GB | 12 GB |
| Qwen2.5 3B | `mlx-community/Qwen2.5-3B-Instruct-4bit` | 8 GB | 16 GB |
| Qwen2.5 7B | `mlx-community/Qwen2.5-7B-Instruct-4bit` | 12 GB | 24 GB |
| Qwen2.5 14B | `mlx-community/Qwen2.5-14B-Instruct-4bit` | 20 GB | 36 GB |
| Qwen2.5 32B | `mlx-community/Qwen2.5-32B-Instruct-4bit` | 36 GB | 64 GB |
| Qwen2.5 72B | `mlx-community/Qwen2.5-72B-Instruct-4bit` | 64 GB | 128 GB |

- En una Mac con chip Apple la memoria es compartida: cuenta toda.
- Con una tarjeta NVIDIA cuenta la memoria de la tarjeta (VRAM), que rinde un tercio más porque el modelo la tiene para él solo.
- Sin ninguna de las dos, un modelo corre en el procesador, más lento, y no se entrena: un LoRA en procesador tarda días.

Desde 3B la base viene en 4 bits (QLoRA), y desde 7B `train.sh` agrega `--grad-checkpoint`. Una ronda de 600 iteraciones tarda de 10 a 40 minutos hasta 3B, y una hora o más por encima. El disco libre que hace falta ronda 5.5 GB por cada mil millones de parámetros, más 2 GB.

## 3 · Servir en Ollama

```
mlx_lm.fuse --model Qwen/Qwen2.5-1.5B-Instruct --adapter-path adapters --save-path fused
```

Ollama lee GGUF. Para Llama y Mistral `mlx_lm.fuse` acepta `--export-gguf`; para Qwen convierte con llama.cpp:

```
git clone --depth 1 https://github.com/ggml-org/llama.cpp && pip install -r llama.cpp/requirements.txt
python3 llama.cpp/convert_hf_to_gguf.py fused --outfile madre.gguf --outtype q8_0
cp <carpeta de MADRE>/docs/training/Modelfile . && ollama create madre-<proyecto> -f Modelfile
```

Con una base en 4 bits (3B en adelante) el paso cambia en tres puntos:
1. `mlx_lm.fuse` lleva `--de-quantize`, para que llama.cpp pueda leer el resultado.
2. La conversión usa `--outtype f16`.
3. `ollama create` lleva `--quantize q4_K_M`, que lo deja en 4 bits, el tamaño que cuenta la tabla.

La pantalla de entrenamiento de MADRE ya escribe así los comandos para el tamaño que elijas.

El nombre importa: `madre-<proyecto>` en minúsculas, con guiones. Al siguiente **REVISAR OTRA VEZ** en Módulos › IA local, `@madre` cambia a ese modelo y Lo que recuerda lo dice. El `Modelfile` viene en `docs/training/` del repositorio de MADRE y del paquete de npm.

## 4 · Evaluar antes de confiar

Antes de promover un modelo nuevo, pregúntale a `@madre` las diez cosas que el proyecto sí decidió y las cinco que nunca discutió. Debe acertar las primeras y decir "el proyecto nunca lo discutió" en las segundas. Si inventa, vuelve al modelo base (`ollama rm madre-<proyecto>`) y entrena con más pares o menos iteraciones.
