FROM node:22-alpine

WORKDIR /app

ARG GIT_COMMIT_SHA=""
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

EXPOSE 8081

CMD ["yarn", "start"]
