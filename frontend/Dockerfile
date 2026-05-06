FROM node:20-alpine

WORKDIR /app

COPY package.json ./

COPY scripts/ ./scripts/

RUN npm install 

COPY . .

# Открываем порт фронтенда (обычно 5173 для Vite или 3000 для Create React App)
EXPOSE 5173

# Запускаем в режиме разработки. 
# ВАЖНО: Если у тебя Vite, запускай с флагом --host, чтобы прокинуть порт наружу контейнера:
# CMD ["npm", "run", "dev", "--", "--host"]
# Если обычный React, достаточно этой команды:
CMD ["npm", "run", "dev"]