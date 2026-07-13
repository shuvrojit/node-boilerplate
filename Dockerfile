FROM node:22-alpine

RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

USER node

RUN HUSKY=0 yarn install --frozen-lockfile

COPY --chown=node:node . .

RUN yarn build

EXPOSE 8000

CMD ["yarn", "start:prod"]
