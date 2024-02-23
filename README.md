# MyArtverse-Backend

Backend for MyArtverse, will be merged into the actual project once MVP is completed

## Project Requirements

- [Nodejs v20.10 or Higher](https://nodejs.org/en)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- (Opt.) [Postgresql](https://www.postgresql.org/)

## Mailserver & Postgres

To use Mailslurper and/or PostgresSQL, simply use `docker-compose up` and visit [http://localhost:8080](http://localhost:8080) to view your inbox -- you must send the email to 127.0.0.1:2500 for it to be sent which can be set in your enviromental file (.env), Postgres will be ran and you can test it locally by connecting `postgres://postgres@postgres:5432/myartverse`

## Running the Server

To run the server, install the dependencies with `yarn` or `yarn install`, run the docker-compose file with `docker-compose up` which will spin an instance of postgres and mailslurper for the backend and to run the project you'll run `yarn dev`

## Links

- [http://localhost:8080](http://localhost:8080) -- Mailslurper Client
- [http://localhost:8081](http://localhost:8081) -- Backend Application
