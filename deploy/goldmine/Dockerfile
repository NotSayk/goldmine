# Contexte de build = racine de ce dépôt.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY packages ./packages
# Les devDependencies sont nécessaires au build (vite, esbuild, typescript)
RUN npm ci --include=dev \
 && NODE_ENV=development npm run build \
 && npm prune --omit=dev
ENV PORT=3000 HOST=0.0.0.0
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "packages/server/dist/index.js"]
