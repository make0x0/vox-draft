FROM mirror.gcr.io/library/node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

CMD ["npm", "run", "dev", "--", "--host"]
