# Agent Claude Code isolé : tourne une fois par jour, dans des règles de permissions strictes.
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl ca-certificates ripgrep jq procps \
 && rm -rf /var/lib/apt/lists/*
# Même uid que l'utilisateur « sayk » de l'hôte (1000), pour que le dossier data/ monté soit inscriptible.
RUN userdel -r node && useradd -m -u 1000 -s /bin/bash agent
USER agent
WORKDIR /home/agent
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:${PATH}"
COPY --chown=agent:agent settings.json /home/agent/.claude/settings.json
COPY --chown=agent:agent prompt.md CLAUDE.md /home/agent/
COPY --chown=agent:agent run.sh /home/agent/run.sh
RUN chmod +x /home/agent/run.sh
ENTRYPOINT ["/home/agent/run.sh"]
