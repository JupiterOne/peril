FROM node:12 as builder
WORKDIR /opt/jupiterone
COPY . .
RUN yarn install && yarn build

FROM node:12
WORKDIR /opt/jupiterone
COPY --from=builder /opt/jupiterone/dist .
RUN yarn install --production
RUN ln -s /opt/jupiterone/bin/run /usr/bin/peril
CMD ["/usr/bin/peril"]
