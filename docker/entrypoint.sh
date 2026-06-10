#!/bin/sh

echo "+ Moving to /myartverse-api"

cd /myartverse-api

echo "+ Installing project dependencies."

npm install yarn -g

yarn 

echo "+ Compiling TSC..."

yarn run compile

echo "+ Starting..."

yarn run start