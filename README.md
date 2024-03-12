# MyArtverse Backend

Backend for MyArtverse, will be merged into the actual project once MVP is completed

## Setup and Installation

> [!NOTE]
> If you have Docker installed, check if the Docker engine is currently running!
>
> For Windows: run `Start-Service docker`
> For macOS/Linux: run `sudo service docker status`

### Prerequisites

- [Nodejs v20.10 or higher](https://nodejs.org/en)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- (Opt.) [Postgresql](https://www.postgresql.org/)

### Database setup

1. Clone the `.env.example` and rename it to `.env`.
   - Windows: `copy .env.example .env.`
   - macOS/Linux: `cp .env.example .env`
1. Run `docker-compose up -d`; this will spin up MinIO, Mailslurper, and a Postgres containers
1. If all containers are running, access the MinIO dashboard by visiting <http://localhost:9090>; the login credentials are `MYARTVERSE` as the user, and `PASSWORD` (in all caps) as the password
   - You can change these default credentials from the docker-compose file
1. Once granted access, head over to "Access Key" page and create an access key
1. Then, create a bucket under Administrator > Buckets, and give it a name

### Server

1. Install this project's dependencies by running `yarn` or `yarn install`
1. Run the server with `yarn dev` that can be accessed via <http://localhost:8081>

### Sending Email

Mailslurper is utilized when registering an email during development, all emails are sent to 127.0.0.1:2500, visit <http://localhost:8080> to check your inbox.

## License

Apache-2.0
