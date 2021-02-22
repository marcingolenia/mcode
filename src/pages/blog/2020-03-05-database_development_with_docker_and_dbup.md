---
templateKey: blog-post
title: Simplifying database development with docker and DbUp
date: 2020-03-05T15:04:10.000Z
description: >-
  Let me show you how you can combine PostgreSQL, Docker and DbUp to create
  pleasant and quick database development environment without installing
  anything (besides docker of course).
featuredpost: false
featuredimage: /img/dbdocker.webp
tags:
  - docker
  - sqlserver
  - postgres
  - database migrations
  - 'F#'
---
I won't introduce you to docker or Postgres - you should have some basic knowledge in this area although I will follow you with every step. When it comes to DbUp it is a .NET Library that helps you deploy changes to your SQL database. It supports:

* SqlServer
* MySql
* SQLite
* PostgreSQL
* Oracle
* Firebird

The assumption around this library is straightforward. It creates a version table to keep track which scripts were executed and applies new ones incrementally. It embraces transitions instead of "state". Thanks to this approach you can upgrade your databases without db downtime. [Check the docs](https://dbup.readthedocs.io/en/latest/) to find out more.

Ready? So let's Go!

## Step 1 - Run PostgresSQL in docker container

Let's start with simple docker-compose.yml:

```docker
version: '3.7'
services:
  db:
    image: postgres
    restart: always
    environment:
      POSTGRES_PASSWORD: Secret!Passw0rd
      POSTGRES_USER: postgres
    ports:
        - 5432:5432
```

Having that file let's just run command `docker-compose up -d`. Now we can verify if docker container with postgres is running on the default port with `docker ps`. You should see this:

```bash
λ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                    NAMES
a7446521a3dg        postgres            "docker-entrypoint.s…"   6 seconds ago       Up 5 seconds        0.0.0.0:5432->5432/tcp   postgres_db_1
```

So once we have postgres up and running we can play a little bit with it by connecting to the container using `docker exec -it a74 bash` (make sure to enter yours container id). After we enter interactie mode let's run `psql -U postgres`. We can list databases using `\l` command or use sql to do whatever we wnat. As an example I will create random database.

```bash
postgres=# CREATE DATABASE mytestdb;
CREATE DATABASE
postgres=# \l
                                 List of databases
   Name    |  Owner   | Encoding |  Collate   |   Ctype    |   Access privileges
-----------+----------+----------+------------+------------+-----------------------
 mytestdb  | postgres | UTF8     | en_US.utf8 | en_US.utf8 |
 postgres  | postgres | UTF8     | en_US.utf8 | en_US.utf8 |
 template0 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres          +
           |          |          |            |            | postgres=CTc/postgres
 template1 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres          +
           |          |          |            |            | postgres=CTc/postgres
(4 rows)

postgres=# \q
root@57368050ac99:/# exit
```

Use `\q` command to exit psql and of course ctr+d combination  to leave container in detached mode.

## Step 2 - Create DbUp Console application

Let's create new netcore console app. You can use your IDE but I will stick with CLI for now. First navigate to the directory with your docker-compose.yml and run `dotnet new console -o DbMigrator` or any other name. Navigate to new project fodler and add two packages

* `dotnet add package dbup-core`
* `dotnet add package dbup-postgresql`

then modify Program.cs:

```csharp 
using System;
using System.Linq;
using System.Reflection;
using DbUp;
	
namespace DbMigrator
{
    class Program
    {
        static int Main(string[] args)
        {
            var connectionString =
                args.FirstOrDefault()
                ?? "Host=localhost;User Id=postgres;Password=Secret!Passw0rd;Database=crazy_database;Port=5432";
            EnsureDatabase.For.PostgresqlDatabase(connectionString);
            var upgrader = DeployChanges.To
                .PostgresqlDatabase(connectionString)
                .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
                .LogToConsole()
                .Build();
            var result = upgrader.PerformUpgrade();
            if (!result.Successful)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(result.Error);
                Console.ResetColor();
                return -1;
            }
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine(value: "Success!");
            Console.ResetColor();
            return 0;
        }
    }
}
```
or Program.fs if you prefer F#, I do :)
```fsharp
﻿open System
open System.Reflection
open DbUp

let logAndParseEngineResult (result: Engine.DatabaseUpgradeResult) =
  match result.Successful with
  | true ->
      Console.ForegroundColor <- ConsoleColor.Green
      Console.WriteLine("Success")
      Console.ResetColor()
      0
  | false ->
      Console.ForegroundColor <- ConsoleColor.Red
      Console.WriteLine result.Error
      Console.ResetColor()
      -1

[<EntryPoint>]
let main argv =
  let connectionString =
    match argv |> Array.tryHead with
    | Some connectionString -> connectionString
    | None ->
        "Server=localhost,1433;Initial Catalog=TravelServicesConsumer;User ID=sa;Password=Strong!Passw0rd;MultipleActiveResultSets=True;Connection Timeout=30;"
  EnsureDatabase.For.SqlDatabase(connectionString)
  DeployChanges.To.SqlDatabase(connectionString)
               .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
               .LogToConsole().Build().PerformUpgrade()
  |> logAndParseEngineResult
```

No magic here. Everything is according to [dbup documentation](https://dbup.readthedocs.io/en/latest/). I made some minor changes as the main example on the docs is for sqlserver. I have also used `EnsureDatabase...` what is fine for local development but remember that for other environments you should create the database before with all necessary settings (collation, security, connlimit etc...). 

Time to run the app! Let dbup create the crazy_database for us. Run `dotnet run` we should see this:

```bash
λ dotnet run                                                                                                     
Master ConnectionString => Host=localhost;Username=postgres;Password=***************;Database=postgres;Port=5432 
Beginning database upgrade                                                                                       
Checking whether journal table exists..                                                                          
Journal table does not exist                                                                                     
No new scripts need to be executed - completing.                                                                 
Success!                                                                                                         
```

We can connect to docker container again and list databases as described in previous point. Use `\c dbname` to connect to specific database. Works for me:

```bash
postgres=# \c crazy_database
You are now connected to database "crazy_database" as user "postgres".
```

Let's add 2 basic sql scripts to create simple tables:

*09032020_AddTable_Customer.sql*
```sql
CREATE TABLE Customers (
    Id int,
    LastName varchar(255),
    FirstName varchar(255),
    Address varchar(255)
);
```
*002_FillSampleData.sql*
```sql
INSERT INTO Customers VALUES
(
    1,
    'Gerard',
    'Thomas',
    'Nowhere 22/11'
),
(
    2,
    'Newman',
    'Oldman',
    'Somwhere 2/12'
)
```
Set the script files as embedded ressources. You can do it in your IDE or in csproj. Example scripts looks like this:

![](/img/2_embedded.png)

Having those things let's run the migrator again.
```bash
λ dotnet run
Master ConnectionString => Host=localhost;Username=postgres;Password=***************;Database=postgres;Port=5432
Beginning database upgrade
Checking whether journal table exists..
Journal table does not exist
Executing Database Server script 'DbMigrator.SqlScripts.001_AddTable_Customer.sql'
Checking whether journal table exists..
Creating the "schemaversions" table
The "schemaversions" table has been created
Executing Database Server script 'DbMigrator.SqlScripts.002_FillSampleData.sql'
Upgrade successful
Success!
```
Perfect! So we already have a postgres instance running in docker container and we are able to incrementally apply migrations using DbUp. Let's see what is in the database;
```bash
λ docker exec -it 43c bash
root@43c7615a4146:/# psql -U postgres
psql (12.2 (Debian 12.2-2.pgdg100+1))
Type "help" for help.

postgres=# \c crazy_database
You are now connected to database "crazy_database" as user "postgres".
crazy_database=# \dt
             List of relations
 Schema |      Name      | Type  |  Owner
--------+----------------+-------+----------
 public | customers      | table | postgres
 public | schemaversions | table | postgres
(2 rows)

crazy_database=# SELECT * FROM schemaversions;
 schemaversionsid |                   scriptname                    |          applied
------------------+-------------------------------------------------+----------------------------
                1 | DbMigrator.SqlScripts.001_AddTable_Customer.sql | 2020-03-03 22:39:44.720556
                2 | DbMigrator.SqlScripts.002_FillSampleData.sql    | 2020-03-03 22:39:44.760178
(2 rows)

crazy_database=#
```
## Step 3 - Run migrations in docker
One may ask why? We already can run DbUp using dotnet CLI against dockerized postgres. This is a good start but when your app is growing and contains different services with different databases this really simplifies your life. Everything you have to do  is `docker-compose up` and you are ready to go with all your databases + schema up to date! This is a game changer when you want to run integration-tests. It is still possible without DbUp being dockerized but the CI scripts are growing with more and more commands. With good docker-compose you simply don't have to worry about that. Also when I write integration tests I tend to play with database causing some rubbish data. It is really easy to `docker-compose down` and `docker-compose up` and have everyting fresh. Multiply this act by few times per day and you can save some time for coffee! 

We have two options here:
* Add more layers on top of postgres image. The layers will contain netcore and DbMibrator.
* Create other docker-image with netcore and DbMigrator. The container with DbMigrator will reach postgres apply migration and exit automatically. 

I tend to use the second approach. Docker society (and the docker team) advises to not create monolithic Dockerfiles (so containing multiple tech things). Think for a while... this should make sense! You should be able to use postgres in your docker-compose by other services without waiting to some migrations to apply (for example to run migrations for other database. Or to spin up some 3rd party service which don't need your migrations but needs postgres). Let's get our hands dirty again.

Create Dockerfile in the DbMigrator project like the following:
```dockerfile
FROM mcr.microsoft.com/dotnet/core/sdk:3.1
WORKDIR /build
COPY DbMigrator.csproj ./
RUN dotnet restore 
COPY . .
RUN dotnet publish -o /publish 
WORKDIR /publish 
CMD ["sh", "-c", "dotnet DbMigrator.dll \"${DB_CONNECTION}\""]
```
It's easy one. If your are not sure what is going on you should definetely check the docker docs. In short (number contains script line numbers):

1. Use dotnet core sdk base image
2. Switch to build directory
3. Copy the csproj first 
4. Restore the packages
5. Copy rest of the files into the container
6. Obvious...
7. Change the working directory to publish
8. Set the default parameters which will be passed to running container and run command with shell (by involving shell we can make use of env variables).

Line 3-4 embrace docker layers caching so we don't need to restore the packages each time we edit a DbMigrator source file. 

Now it is time to update our compose-file. 

```docker
version: '3.6'
services:
  db:
    image: postgres
    restart: always
    environment:
      POSTGRES_PASSWORD: Secret!Passw0rd
      POSTGRES_USER: postgres
      POSTGRES_DB: crazy_database
    ports:
      - 5432:5432
  db-migrations:
    build:
      context: DbMigrator/
      dockerfile: ./Dockerfile
    depends_on: 
      - db
    environment:
      DB_CONNECTION: "Host=db;User Id=postgres;Password=Secret!Passw0rd;Database=crazy_database;Port=5432"
```

The `depends_on` tells docker that even if we decide to run this command:
``docker-compose up -d db-migrations``
then it should run db container first as this is its upstream dependency.

DONE! 

Let's check if this works. Just run ``docker-compose up -d``. I have this output:
```bash
λ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                    NAMES
d4546121a9ec        postgres            "docker-entrypoint.s…"   6 seconds ago       Up 5 seconds        0.0.0.0:5432->5432/tcp   postgres_db_1
```
Where is our migrator? Nowhere. There is no long-running process that docker can attach to (some kind of web listener on specific port). The Migrator was deployed and exited so the container lifecycle ended. Let's check the compose logs using ``docker-compose logs``.

```bash
db-migrations_1  | Master ConnectionString => Host=db;Username=postgres;Password=***************;Database=postgres;Port=5432
db-migrations_1  | Unhandled exception. System.Net.Sockets.SocketException (111): Connection refused
db-migrations_1  |    at Npgsql.NpgsqlConnector.Connect(NpgsqlTimeout timeout)
db-migrations_1  |    at Npgsql.NpgsqlConnector.RawOpen(NpgsqlTimeout timeout, Boolean async, CancellationToken cancellationToken)
db-migrations_1  |    at Npgsql.NpgsqlConnector.Open(NpgsqlTimeout timeout, Boolean async, CancellationToken cancellationToken)
db-migrations_1  |    at Npgsql.ConnectorPool.AllocateLong(NpgsqlConnection conn, NpgsqlTimeout timeout, Boolean async, CancellationToken cancellationToken)
db-migrations_1  |    at Npgsql.NpgsqlConnection.Open(Boolean async, CancellationToken cancellationToken)
db-migrations_1  |    at Npgsql.NpgsqlConnection.Open()
db-migrations_1  |    at PostgresqlExtensions.PostgresqlDatabase(SupportedDatabasesForEnsureDatabase supported, String connectionString, IUpgradeLog logger)
db-migrations_1  |    at PostgresqlExtensions.PostgresqlDatabase(SupportedDatabasesForEnsureDatabase supported, String connectionString)
db-migrations_1  |    at DbMigrator.Program.Main(String[] args) in /build/Program.cs:line 15
db_1             | performing post-bootstrap initialization ... ok
```

That's bad. What's going on? Postgres didn't make it to be up sooner than migrator so the connection was refused. Let's add restart on-failure policy to compose yml file:
```docker
services:
  db:
    image: postgres
    restart: always
    environment:
      POSTGRES_PASSWORD: Secret!Passw0rd
      POSTGRES_USER: postgres
    ports:
      - 5432:5432
  db-migrations:
    build:
      context: DbMigrator/
      dockerfile: ./Dockerfile
    depends_on: 
      - db
    environment:
      DB_CONNECTION: "Host=db;User Id=postgres;Password=Secret!Passw0rd;Database=crazy_database;Port=5432"
    restart: on-failure
```

Let's run everything again. First let's check for running containers:
```bash
λ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
```
Empty. Let's compose up again:
```bash
λ docker-compose up -d --build
Starting postgres_db_1 ... done
Starting postgres_db-migrations_1 ... done
```
Let's enter containers bash and check the db schema:
```bash
λ docker exec -it 30d bash
root@30db9b19add6:/# psql -U postgres
psql (12.2 (Debian 12.2-2.pgdg100+1))
Type "help" for help.

postgres=# \l
                                    List of databases
      Name       |  Owner   | Encoding |  Collate   |   Ctype    |   Access privileges
-----------------+----------+----------+------------+------------+-----------------------
 crazy_database  | postgres | UTF8     | en_US.utf8 | en_US.utf8 |
 postgres        | postgres | UTF8     | en_US.utf8 | en_US.utf8 |
 template0       | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres          +
                 |          |          |            |            | postgres=CTc/postgres
 template1       | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres          +
                 |          |          |            |            | postgres=CTc/postgres
(5 rows)

postgres=# \c crazy_database
You are now connected to database "crazy_database" as user "postgres".
crazy_database=# \dt
             List of relations
 Schema |      Name      | Type  |  Owner
--------+----------------+-------+----------
 public | customers      | table | postgres
 public | schemaversions | table | postgres
(2 rows)

crazy_database=#
```
Done! 

## Troubles when using visual studio?
One thing you may run into when playing with docker:
```
Traceback (most recent call last):
  File "site-packages\docker\utils\build.py", line 96, in create_archive
PermissionError: [Errno 13] Permission denied: '\\\\?\\C:\\postgres\\DbMigrator\\.vs\\DbMigrator\\v16\\Server\\sqlite3\\db.lock'
```
Just add ``.dockerignore`` file with this content:
```docker
.vs
```
And you are good to go (we've just ignored some visual studio internal things from docker commands ie copy).

## Github repo
Is here: https://github.com/marcingolenia/postgres-dbup

## Summary
I hope you will enjoy this way of database development. You should be able to use SqlServer in very similar way - just change the db service in compose file, Program.cs of DbMigrator to work with SqlServer and of course connection string. Check my blog again for next post about some tips for working with migrations!
