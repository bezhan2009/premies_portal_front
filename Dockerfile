# ---------- BUILD STAGE ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM nginx:stable-alpine

# Копируем статику
COPY --from=build /app/dist /usr/share/nginx/html

COPY .env /usr/share/nginx/html/.env

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
