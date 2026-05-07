# Terminar Docker Compose
docker compose down -v

# Limpiar imágenes y contenedores
docker compose down -v

# Iniciar Docker Compose
docker compose up -d

npx prisma migrate dev
npx prisma db seed

pnpm seed:skins

pnpm indev