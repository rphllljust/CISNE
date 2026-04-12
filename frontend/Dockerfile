FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
ARG API_UPSTREAM=
ENV API_UPSTREAM=${API_UPSTREAM}
ENV API_UPSTREAM_FALLBACK=http://backend:3000
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -q --spider http://127.0.0.1/healthz || exit 1
EXPOSE 80
CMD ["sh", "-c", "if [ -z \"$API_UPSTREAM\" ]; then if [ -n \"$BACKEND_URL\" ]; then API_UPSTREAM=\"$BACKEND_URL\"; elif [ -n \"$BACKEND_RAILWAY_PRIVATE_DOMAIN\" ]; then API_UPSTREAM=\"http://$BACKEND_RAILWAY_PRIVATE_DOMAIN:3000\"; else API_UPSTREAM=\"$API_UPSTREAM_FALLBACK\"; fi; fi; export API_UPSTREAM; echo \"Using API_UPSTREAM=$API_UPSTREAM\"; envsubst '$API_UPSTREAM' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
