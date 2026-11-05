# # Stage 1: сборка фронтенда (нужен Node.js)
# FROM node:21.7.1-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .

# # Если у тебя есть команда сборки (например, Vite/Webpack) — раскомментируй:
# # RUN npm run build

# # Копируем нужные ES-модули для Three.js и three-mesh-bvh в отдельную папку
# RUN mkdir -p /build/static/js && \
#     cp node_modules/three/build/three.module.js /build/static/js/three.module.js && \
#     cp node_modules/three-mesh-bvh/build/index.module.js /build/static/js/three-mesh-bvh.module.js

# Сюда можно добавить копирование index.html, main.js и т.п. из проекта
# COPY index.html /build/
# COPY main.js /build/static/js/


# Stage 2: финальный образ (только Nginx)
FROM nginx:1.22.1

# Твой конфиг Nginx
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Копируем собранные файлы из stage 1 в папку, которую Nginx будет отдавать
# COPY --from=builder /build /usr/share/nginx/html