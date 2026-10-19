#!/usr/bin/env bash
# À lancer SEULEMENT après avoir vérifié que ssh sayk@IP (par clé) fonctionne.
set -euo pipefail
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
CONF
sshd -t && systemctl reload ssh
echo "SSH verrouillé : clé uniquement, root désactivé."
