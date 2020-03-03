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
    ports:
        - 5432:5432
```

Having that file just run command `docker-compose up -d`. Then let's verify if docker container with postgres is running on the default port with `docker ps`. You should see this:

![](/img/1_docker_ps.png)

So we have postgres up and running. We can play a little bit with it by connecting to the container using `docker exec -it a74 bash`. After we enter interactie mode let's run `psql -U postgres`. We can list databases using `\l` command or use sql to do whatever we wnat. Let's for example create random database.

```
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

Let's just create new netcore console app. You can use your IDE but let's stick with CLI in this blog post. First navigate to the directory with your docker-compose.yml and run `dotnet new console -o DbMigrator` or any other name. Navigate to new project fodler and add two packages

* `dotnet add package dbup-core`
* `dotnet add package dbup-postgresql`

then modify Program.cs:

```
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

No magic here. Everything is according to [dbup documentation](https://dbup.readthedocs.io/en/latest/). I made some minor changes as the main example on the docs is for sqlserver. I have also used `EnsureDatabase...` what is fine for local development but remember that for other environments you should create the database before with all necessary settings (collation, security, connlimit etc...). 

Time to run the app! Let dbup create the crazy_database for us. Run `dotnet run` we should see this:

```
λ dotnet run                                                                                                     
Master ConnectionString => Host=localhost;Username=postgres;Password=***************;Database=postgres;Port=5432 
Beginning database upgrade                                                                                       
Checking whether journal table exists..                                                                          
Journal table does not exist                                                                                     
No new scripts need to be executed - completing.                                                                 
Success!                                                                                                         
```

We can connect to docker container again and list databases as described in previous point. Use `\c dbname` to connect to specific database. Works for me:

```
postgres=# \c crazy_database
You are now connected to database "crazy_database" as user "postgres".
```

Let's add 2 basic sql scripts to create simple tables.

![](/img/2_embedded.png)

Set the script files as embedded ressources. You can do it in your IDE or in csproj. Example scripts looks like this:

`001_AddTable_Customer.sql`
```
CREATE TABLE Customers (
    Id int,
    LastName varchar(255),
    FirstName varchar(255),
    Address varchar(255)
);
```
`002_FillSampleData.sql`
```
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
Having those things let's run the migrator again.
```
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
Perfect! So we already have a postgres instance running in docker container and we are able to incrementally apply migrations using DbUp. Let's see what's in the database;
```
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

crazy_database=# SELECT * FROM schemaversions
crazy_database-# ;
 schemaversionsid |                   scriptname                    |          applied
------------------+-------------------------------------------------+----------------------------
                1 | DbMigrator.SqlScripts.001_AddTable_Customer.sql | 2020-03-03 22:39:44.720556
                2 | DbMigrator.SqlScripts.002_FillSampleData.sql    | 2020-03-03 22:39:44.760178
(2 rows)

crazy_database=#
```
## Step 3 - Run migrations in docker
Coming soon :)
