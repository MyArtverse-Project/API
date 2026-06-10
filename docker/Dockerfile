FROM node:current-trixie-slim


USER root

ADD ./ /myartverse-api

WORKDIR /myartverse-api

ENV app_port=3000
ENV app_postgresql_url=postgresql://localhost

EXPOSE 3000

ENTRYPOINT [ "/myartverse-api/docker/entrypoint.sh" ]