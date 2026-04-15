FROM node:18-alpine
WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Copy app
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD [ "node", "server/search-api.js" ]
