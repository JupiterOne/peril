FROM node:12 as builder
WORKDIR /opt/jupiterone
COPY . .
RUN yarn install && yarn build

FROM node:12-alpine
WORKDIR /opt/jupiterone
RUN apk update && apk upgrade && apk add --no-cache bash git gnupg
COPY --from=builder /opt/jupiterone/dist .
RUN yarn install --production
RUN ln -s /opt/jupiterone/bin/run /usr/bin/peril
RUN pwd
CMD ["/usr/bin/peril"]
