# ---------- BUILD STAGE ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Важно: Убедись, что VITE_BACKEND_URL задан через переменную окружения
# Или зашит в .env.production
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM nginx:stable-alpine

# Удалим дефолтный конфиг
RUN rm /etc/nginx/conf.d/default.conf

# Добавим свой конфиг
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем билд Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
