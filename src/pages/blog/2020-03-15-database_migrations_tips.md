---
templateKey: blog-post
title: Database migrations tips
date: 2020-03-15T15:09:10.000Z
description: >-
  Running migrations using DbUp, FluentMigrator, Ef Migrations or any other tool
  is really easy to start with.  With some tips you may successfully survive a
  long-running project with no stress or sad expierences.
featuredpost: false
featuredimage: /img/dbup.webp
tags:
  - database migrations
---
## 1. Make sure that you will not lost the data

Imagine that you store user password in the database as a plain string (just imagine don't do). Now the time has come to fix this let's say strange situation. So you want to md5 hash the passwords. You prepare the migration script, update the codebase and run everything. Boom - something crashed in the app so you quickly have to restore the previous version so the company can still make money on their clients. Unfortunately... the passwords are hashed and there is no way back. You have just caused a bigger delay than you should (probably you have to restore a backup and loose fresh data or fix the bug in the app and make everyone wait). In such cases please:

1. Prepare a migration script that extends the table with one column more and keep the old one
2. Update the application code
3. Deploy the application
4. If everything works create new migrations that drops the old column

This may mean that they won't refuse you next salary raise.

## 2. Don't modify or delete your scripts

I had been doing this in the past. The database schema was getting more and more complicated so I thought it might be a brilliant idea to aggregate some migrations. For example - we can give up adding columns somewhere later in migrations for extending the main migration that creates the table. This requires modifications in the Versions table done by hand in production. This may work but you do put yourself into unnecessary risk. You won't gain much - there are less files with migrations but does this help you somehow? You don't have to maintain them, modify. All you have to do is to introduce a new transition from state A to state B. If the amount of files is annoying you just put them into a directory (for example with the name of the year - 2019, 2020, etc).

## 3. Use timestamps for versioning

A common naming pattern I see for migration naming is a sequential integer + description. For example:

* 1-AddCustomersTable.sql
* 2-AddOrdersTable.sql

This works fine if you are a 1-member team (or 2). In bigger teams sooner or later this will end up like this:

* 1-AddCustomersTable.sql
* 2-AddOrdersTable.sql
* 2-AddSuppliersTable.sql
* 4-ExtendCustomersTableWithName.sql

It's not a tragedy. You do the code review so you can catch this and resolve conflicts... but you don't have to. There is another way. Just use timestamps:

* 1607176125-AddCustomerTable.sql
* 1607912575-AddOrdersTable.sql
* 1607976875-AddSuppliersTable.sql

## 4. Use the right DSL

There are two main options for writing migrations. One is using the syntax which the chosen migrator provides for you like fluent syntax from fluent migrator or EntityFramework migrations. This may look more or less like this:

```csharp
Create.Table(tableName: "Clients")
  .WithColumn(name: "Id")
  .AsInt32()
  .PrimaryKey()
  .Identity()
  .WithColumn(name: "Name")
  .AsString(int.MaxValue)
  .NotNullable()
  .WithColumn(name: "AccountNumber")
  .AsString(int.MaxValue)
  .NotNullable();
Create.ForeignKey(foreignKeyName: "FK_Clients_To_Departments")
  .FromTable(table: "Departments")
  .InSchema(schemaName: "dbo")
  .ForeignColumn(column: "ClientId")
  .ToTable(table: "Client")
  .InSchema(schemaName: "dbo")
  .PrimaryColumn(column: "Id");
```

This can be tempting because it's C# - the language you love but there are 2 drawbacks: 

1. This is really verbose - try to write it in SQL.
2. After a few months you will come to a funny and sad situation asking yourself a question:

   > Damn! What was syntax in pure SQL to create a foreign key? 

This happened to me and I also got similar feedback from my friend. 

And finally there is one important question: Isn't it SQL being the best DSL for database development? A good migrator should give you the flexibility to use SQL scripts instead their own "DSL".

## 5. Don't do database changes outside your migrator

There are some cool tools in Azure like automatic tuning that can do *create index recommendations* and much more. This is tempting to just click *apply* and have some optimizations. Cool down however... remember that you won't have this change on other environments! Examine the recommendation copy the suggested SQL and introduce the changes using migrations. Step by step try to mimic your production environment as much as it is possible.

## 6. Use the migrator of your choice to deploy your database everywhere

This is really bad. I have met one team once that was writing EF migrations but they were not allowed to use it in production. Some kind of Db Emperor was taking their database from the UAT environment and then he generated the mighty change script. When you are an Emperor of the DB kingdom you can of course do much more than that! Apply additional indexes, drop some `NOT NULL` constraints... Easy to guess - the team was struggling with bugs from production that couldn't be easily (or not at all) replicated in their environment. 

Once you decide to use migrations - use them starting from your local machine and ending on production.

## 7. Don't waste your time on writing Down migrations

I had been doing this for long time. Trust me - it's not worth it. I didn't run down migration even once in my life in production.  There is a interesting [discussion about down migrations on dbup github issues](https://github.com/DbUp/DbUp/issues/42) - check it out. I fully agree with some people there saying that writing down migrations is a big overhead for the team and mostly it will be faster to just rollup a bugfix or in the worst case restore a backup.

## 8. Migrations on application startup are a bad idea

Unfortunately this is something really common in .Net people that are fans of EntityFramework. Your application is the application that solves business problems (mostly) thus shouldn't deal with database schema and will tell you why:

* Security reason. Your application database user shouldn't have the right to create/drop database object (unless you are doing something extra specific - in most cases you don't). Read/Write should be enough. 
* Scaling - Imagine you want to deploy your app in 5 instances. Now you have to deal with 5 processes concurrently running migrations into one database instead of one. Good luck.
* You will be able to deploy you app with migrations that can't be executed properly. This will simply bring the application down. When the migrations are separated you can first deploy migrations and if this step was successful then the app. You can ignore those errors on app startup but this is a way to loose control.
* You will introduce mental coupling. After some time everyone will assume that the new code only runs with the newest database schema. This can be harmful when you want to consider blue/green deploy or canary releases. In this approaches your app should be able to work with the older schema version.

## 9. Dockerize your migrations

It's not something necessary but this can increase your productivity. [Check my post on how to do it with postgres and dbup](../2020-03-05-database_development_with_docker_and_dbup) (but doing this with other relational databases should be similar).

## 10. Don't be afraid to talk about migrations with business representatives

Sometimes you simply have to ask about default values for new columns - in the business people language of course. For example: 

> Hey, I am just finishing adding the account number to our customers but I don't know what should we put there for the existing ones. Should this be some kind of N/A to be filled later by our admin-users or You want me to fill them in advance with the file you will provide to me? 

## 11. Migrations scripts should be idempotent

This means that your scripts should be wrapped with code that checks for database objects existence. For example: `CREATE TABLE IF NOT EXISTS <tablename>`, or `ALTER TABLE if exists <tablename> add if not exists <columnname> <columntype>` in postgres or for sql server: 

```sql
IF NOT EXISTS (
  SELECT * 
  FROM   sys.columns 
  WHERE  object_id = OBJECT_ID(N'[dbo].[<tablename>]') 
         AND name = '<columnname>'
)
```

and so on. The migrator tracks scripts that have already been executed, but when your have idempotence you can easily switch from one migrator to the other one (being specific-tool independent is good practice). Just move the migrations-scripts to a new project then execute. 

## Summary

I hope that these tips will make your life easier. With some extra awareness while writing database migration you can save some mistakes that I had been making. Good luck!
