FROM node:14-alpine

WORKDIR /usr/app

COPY ./package.json .

RUN npm i

COPY . .

CMD ["npm", "start"]