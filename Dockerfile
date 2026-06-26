# ---------- BUILD STAGE ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM nginx:stable-alpine

# Install openssl for certificate generation
RUN apk add --no-cache openssl

# Удалим дефолтный конфиг
RUN rm /etc/nginx/conf.d/default.conf

# Добавим свой конфиг
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаем директорию для SSL сертификатов
RUN mkdir -p /etc/letsencrypt/live/daily/

# Генерируем самоподписанный SSL сертификат
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/daily/activ24.tj.key \
    -out /etc/letsencrypt/live/daily/activ24.tj.crt \
    -subj "/CN=daily.activ24.tj"

# Копируем билд Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
