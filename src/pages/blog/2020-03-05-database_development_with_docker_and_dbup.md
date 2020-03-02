---
templateKey: blog-post
title: Simplifying database development with docker and DbUp
date: 2020-02-24T15:04:10.000Z
description: >-
  Let me show you how you can combine PostgreSQL, Docker and DbUp to create
  pleasant and quick database development environment without installing
  anything (besides docker of course).
featuredpost: false
featuredimage: /img/dbdocker.png
tags:
  - docker
  - sqlserver
  - postgres
---
I won't introduce you to docker or Postgres but in short DbUp is a .NET Library that helps you deploy changes to your SQL database. It supports:

* SqlServer
* MySql
* SQLite
* PostgreSQL
* Oracle
* Firebird

The assumption around this library is straightforward. It creates a Version table to keep track which scripts were executed and applies new ones incrementally. [Check the docs](https://dbup.readthedocs.io/en/latest/) to find out more.

## Step 1 - Run PostgresSQL in docker container
Let's start with simple docker-compose.yml:
```
version: '3.7'
services:
  db:
    image: postgres
    restart: always
    environment:
      POSTGRES_PASSWORD: Secret!Passw0rd
```
Having that file just run command `docker-compose up -d`. Then let's verify if docker container with postgres is running on the default port with `docker ps`. You should see this:

## Step 2 - Create DbUp Console application
## Step 3 - Run migrations in docker



