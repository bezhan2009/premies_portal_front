# ---------- BUILD STAGE ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM nginx:stable-alpine

# Удалим дефолтный конфиг
RUN rm /etc/nginx/conf.d/default.conf

# Добавим свой конфиг
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем билд Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
