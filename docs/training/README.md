# MADRE AI · entrenar el modelo del proyecto

Roadmap 2c. La sala exporta lo que recuerda como pares de chat; tú entrenas un modelo pequeño con ellos en tu máquina; Ollama lo sirve; `@madre` lo usa en cuanto existe. Todo local.

## 1 · Exportar

Desde MU/TH/UR → `⚙ CONNECTIONS` → `MEMORY` → `EXPORT DATASET`, o en terminal:

```
madre dataset            # en la carpeta del proyecto
```

Escribe `~/.pulse/rooms/<sala>/dataset/{train.jsonl, valid.jsonl, manifest.json}`. Cada línea es `{"messages":[{role:"system"},{role:"user"},{role:"assistant"}]}`: los turnos reales de la sala, redactados (sin rutas, nombres, correos ni claves), más las notas destiladas como pares de recuerdo. GHOST nunca está.

Cuánto hace falta: con menos de ~200 pares el modelo aprende el tono y poco más; a partir de ~1000 empieza a valer. Exporta cada tanto; el split es determinista, así que las líneas no cambian de lado.

## 2 · Entrenar (Apple Silicon, mlx-lm)

```
python3 -m venv ~/.madre-train && source ~/.madre-train/bin/activate
pip install mlx-lm
cd ~/.pulse/rooms/<sala>
mlx_lm.lora --model Qwen/Qwen2.5-1.5B-Instruct --train --data dataset --iters 600 --batch-size 2 --learning-rate 1e-5 --adapter-path adapters
mlx_lm.lora --model Qwen/Qwen2.5-1.5B-Instruct --adapter-path adapters --data dataset --test
```

`train.sh` en esta carpeta hace lo mismo con comprobaciones. En 16 GB usa el 1.5B; con 32 GB o más, `Qwen/Qwen2.5-3B-Instruct` o `Qwen/Qwen2.5-Coder-7B-Instruct` con `--batch-size 1`. Una ronda de 600 iteraciones tarda de 10 a 40 minutos.

## 3 · Servir en Ollama

```
mlx_lm.fuse --model Qwen/Qwen2.5-1.5B-Instruct --adapter-path adapters --save-path fused
```

Ollama lee GGUF. Para Llama y Mistral `mlx_lm.fuse` acepta `--export-gguf`; para Qwen convierte con llama.cpp:

```
git clone --depth 1 https://github.com/ggml-org/llama.cpp && pip install -r llama.cpp/requirements.txt
python3 llama.cpp/convert_hf_to_gguf.py fused --outfile madre.gguf --outtype q8_0
cp docs/training/Modelfile . && ollama create madre-<proyecto> -f Modelfile
```

El nombre importa: `madre-<proyecto>` en minúsculas, con guiones. Al siguiente `RECHECK` en MODULES → OLLAMA, `@madre` cambia a ese modelo y la tarjeta MEMORY lo dice.

## 4 · Evaluar antes de confiar

Antes de promover un modelo nuevo, pregúntale a `@madre` las diez cosas que la sala sí decidió y las cinco que nunca discutió. Debe acertar las primeras y decir "la sala nunca lo discutió" en las segundas. Si inventa, vuelve al modelo base (`ollama rm madre-<proyecto>`) y entrena con más pares o menos iteraciones.
