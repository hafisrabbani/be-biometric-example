FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Stage 2: production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3050

CMD ["npm", "start"]