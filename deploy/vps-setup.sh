#!/usr/bin/env bash
# Durcissement + Docker + Caddy pour un VPS Debian 12 / Ubuntu.
# Usage (en root, une fois connecté) :  bash vps-setup.sh "ssh-ed25519 AAAA... ton@pc"
set -euo pipefail

USER_NAME="sayk"
PUBKEY="${1:-}"
[ "$(id -u)" -eq 0 ] || { echo "À lancer en root"; exit 1; }
[ -n "$PUBKEY" ] || { echo "Passe ta clé publique SSH en argument"; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get -y upgrade
apt-get -y install ufw fail2ban unattended-upgrades curl ca-certificates sudo

# Utilisateur non-root avec ta clé SSH
id "$USER_NAME" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$USER_NAME"
usermod -aG sudo "$USER_NAME"
echo "$USER_NAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-$USER_NAME
install -d -m 700 -o "$USER_NAME" -g "$USER_NAME" /home/$USER_NAME/.ssh
echo "$PUBKEY" > /home/$USER_NAME/.ssh/authorized_keys
chown "$USER_NAME:$USER_NAME" /home/$USER_NAME/.ssh/authorized_keys
chmod 600 /home/$USER_NAME/.ssh/authorized_keys

# Pare-feu : SSH + web uniquement
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker "$USER_NAME"

# Caddy (reverse proxy multi-projets)
install -d -o "$USER_NAME" -g "$USER_NAME" /home/$USER_NAME/apps/caddy
docker network inspect web >/dev/null 2>&1 || docker network create web
cat > /home/$USER_NAME/apps/caddy/Caddyfile <<'CADDY'
# Un bloc par projet :
# goldmine.sayk.fr {
#     reverse_proxy goldmine:3000
# }
CADDY
cat > /home/$USER_NAME/apps/caddy/docker-compose.yml <<'YML'
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443", "443:443/udp"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks: [web]
volumes:
  caddy_data:
  caddy_config:
networks:
  web:
    external: true
YML
chown -R "$USER_NAME:$USER_NAME" /home/$USER_NAME/apps
(cd /home/$USER_NAME/apps/caddy && docker compose up -d)

echo
echo "OK. ÉTAPE SUIVANTE : dans un AUTRE terminal, teste  ssh $USER_NAME@<IP>"
echo "Quand ça marche, verrouille root + mots de passe :  bash vps-lock-ssh.sh"
