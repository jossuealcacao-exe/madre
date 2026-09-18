#!/usr/bin/env bash
# MADRE AI · one LoRA round on this room's dataset with mlx-lm (Apple Silicon).
#   docs/training/train.sh <room-dir> [base-model] [iters]
set -euo pipefail
ROOM="${1:?room dir, e.g. ~/.pulse/rooms/<sala>}"
BASE="${2:-Qwen/Qwen2.5-1.5B-Instruct}"
ITERS="${3:-600}"
[ -f "$ROOM/dataset/train.jsonl" ] || { echo "no dataset: run 'madre dataset' first"; exit 2; }
PAIRS=$(wc -l < "$ROOM/dataset/train.jsonl")
[ "$PAIRS" -ge 50 ] || { echo "only $PAIRS training pairs; let the room grow (aim for a few hundred)"; exit 3; }
python3 -c "import mlx_lm" 2>/dev/null || { echo "pip install mlx-lm (inside a venv) first"; exit 4; }
cd "$ROOM"
echo "training LoRA on $PAIRS pairs · base $BASE · $ITERS iterations"
mlx_lm.lora --model "$BASE" --train --data dataset --iters "$ITERS" --batch-size 2 --learning-rate 1e-5 --adapter-path adapters
mlx_lm.lora --model "$BASE" --adapter-path adapters --data dataset --test
echo
echo "adapters in $ROOM/adapters · next: mlx_lm.fuse, convert to GGUF, ollama create madre-<project> (see README.md)"
