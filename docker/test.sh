#!/bin/sh
echo "In case of file failure, please run this in the main project directory. [../]"
echo "This will ask for sudo permissions anyways. You may be prompted to enter your password."
sudo echo "+ Hello, world!"

echo "+ Using compose to build and spin up containers."
sudo docker compose up -d