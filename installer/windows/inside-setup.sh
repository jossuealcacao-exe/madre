#!/bin/sh
# SPDX-License-Identifier: BUSL-1.1
# MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
#
# Runs as root inside the «MADRE» WSL distribution the Windows installer created (madre.nsi), once
# on install and again on every repair. It leaves a Linux where MADRE opens with no terminal and no
# question: the person's user, Node, the tools MADRE and its agents need, and MADRE itself.
#
#   sh inside-setup.sh <windows user name>
#
# The distribution is MADRE's own, never the person's Ubuntu: nothing here touches another Linux.
# Its user has sudo without a password. That gives nothing away: any Windows program of this user
# already becomes root here with `wsl.exe -u root`. It lets MADRE install Ollama and its updates
# without a password prompt nobody would see (src/modules/ollama.mjs, adminHere).
set -eu

say() { printf '\n== %s\n' "$1"; }

# A Linux user name from the Windows one: accents dropped (José → jose), lowercase letters, digits,
# - and _; «madre» if nothing is left.
name=$(printf '%s' "${1:-}" | { LC_ALL=C.UTF-8 iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null || cat; } | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-' | sed 's/^[^a-z_]*//' | cut -c1-32)
[ -n "$name" ] || name=madre
case "$name" in root|daemon|bin|sys|nobody|ubuntu) name="${name}-madre" ;; esac

say "Tools"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
# zstd: Ollama's own installer needs it (WIN-029). wslu: wslview opens pages in Windows' browser.
apt-get install -y -q ca-certificates curl git sudo zstd wslu

say "User $name"
id "$name" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash --groups sudo "$name"
printf '%s ALL=(ALL) NOPASSWD:ALL\n' "$name" > /etc/sudoers.d/90-madre
chmod 440 /etc/sudoers.d/90-madre

# The person never opens this Linux by hand: no first-run questions, and they are its user.
cat > /etc/wsl.conf <<EOF
[boot]
systemd=true

[user]
default=$name
EOF
if [ -f /etc/wsl-distribution.conf ]; then sed -i '/^command[[:space:]]*=/d' /etc/wsl-distribution.conf; fi

say "Node.js"
if ! node --version 2>/dev/null | grep -Eq '^v(2[2-9]|[3-9][0-9])\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi
node --version

say "MADRE"
# In the user's own npm folder: MADRE updates itself later without sudo. ~/.local/bin is on the
# PATH of every login shell Ubuntu starts (~/.profile), and the Start menu shortcut starts one.
su - "$name" -c 'mkdir -p "$HOME/.local" && npm config set prefix "$HOME/.local" && npm install --global --no-fund --no-audit @jossuealcala/madre@latest'
su - "$name" -c '"$HOME/.local/bin/madre" --version'

say "Ready"
