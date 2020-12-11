---
templateKey: blog-post
title: >-
  Make F# play nice with C# Part 2 - how to handle option and nullable mismatch and work with dapper
date: 2020-07-11T18:41:11.000Z
description: >-
  This is the next part of the C# and F# integration journey. This time we will look into Dapper functional wrapper and option vs nullable type mismatch. Together with the previous post, we will close the loop of C# and F# coexistence. 
featuredpost: false
featuredimage: /img/cf.png
tags:
  - 'F#'
  - 'C#'
---
## 1. Introduction
If you are interested just in making dapper more usable in F# or conversion between F# option <-> C# Nullable then this is the article for you. However, if you are looking for how-to integrate C# with F# in general you should also read my previous article about [composing dependencies in C# and F# hybrid solution](../2020-06-14-fsharp_with_csharp).

## 2. Nullable to option, option to nullable 
If one will try to return option types from C# controller it will end up with JSON like this:
```json
[
  {
    "id": 3,
    "openedAt": "2020-06-21T12:26:48.3966667",
    "invoicesCount": 0
  },
  {
    "id": 2,
    "openedAt": "2020-06-21T12:26:44.81",
    "closedAt": {
      "case": "Some", // This is how option type was serialized.
      "fields": [
        "2020-06-21T12:26:48.3966667"
      ]
    },
    "invoicesCount": 0
  }
]
```
Not so nice or is it? Keep in mind that `None` is missing at all in the JSON. Let's do some `option` to `null` conversation to achieve the following:
```json
[
  {
    "id": 3,
    "openedAt": "2020-06-21T12:26:48.3966667",
    "invoicesCount": 0
  },
  {
    "id": 2,
    "openedAt": "2020-06-21T12:26:44.81",
    "closedAt": "2020-06-21T12:26:48.3966667",
    "invoicesCount": 0
  }
]
```
The F# util module that can help us with null <-> option transformation is straightforward, let me just paste it:
```fsharp
module NullableOptionUtil

let ToOption (n: System.Nullable<_>) =
    if n.HasValue then Some n.Value else None

let StringToOption(n: string) =
    if System.String.IsNullOrEmpty(n) then None else Some n

let ToNullable (n: option<'a>) =
    if n.IsSome then new System.Nullable<'a>(n.Value) else new System.Nullable<'a>()

```
The util is extra easy to use. Find the example below:
```csharp
namespace Api.Dtos
{
    using System;
    using static NullableOptionUtil;

    public class SaleInvociesReportDto
    {
        public int Id { get; set; }
        public DateTime OpenedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        public int InvoicesCount { get; set; }

        public static SaleInvociesReportDto FromQueryResult(Queries.SalesInvoiceReportsResult saleInvoiceReport) =>
        new SaleInvociesReportDto
        {
            Id = saleInvoiceReport.Id,
            OpenedAt = saleInvoiceReport.OpenedAt,
            ClosedAt = ToNullable(saleInvoiceReport.ClosedAt),
            InvoicesCount = saleInvoiceReport.InvoicesCount
        };
    }
}

```
Easy peasy, but can we do better? Can we do something to stop thinking about `null` to `option` conversion? Also, I don't like writing DTOs when I do CQRS - the query results are already prepared for reading, creating DTO had been always 1:1 copy so I just stopped doing them for the "query part". So let's instruct our serializer on how to deal with the `option`. I did it in F# but if you prefer C#, go with C#. It is heavily inspired by Lev Gorodinski's post [1] about different converters.
```fsharp
module OptionConverter

open System
open Microsoft.FSharp.Reflection
open Newtonsoft.Json

type OptionConverter() =
    inherit JsonConverter()

    override converter.CanConvert(typeParam) =
        typeParam.IsGenericType && typeParam.GetGenericTypeDefinition() = typedefof<option<_>>

    override converter.WriteJson(writer, value, serializer) =
        let value =
            match value with
            | null -> null
            | _ -> (FSharpValue.GetUnionFields(value, value.GetType()) |> snd).[0]
        serializer.Serialize(writer, value)

    override converter.ReadJson(reader, typeParam, _, serializer) =
        let innerType = typeParam.GetGenericArguments().[0]
        let innerType =
            match innerType.IsValueType with
            | true -> (typedefof<Nullable<_>>).MakeGenericType([| innerType |])
            | _ -> innerType
        let value = serializer.Deserialize(reader, innerType)
        let cases = FSharpType.GetUnionCases(typeParam)
        match value with
        | null -> FSharpValue.MakeUnion(cases.[0], [||])
        | _ -> FSharpValue.MakeUnion(cases.[1], [| value |])
```
Now you can delete the DTO, and return the query result directly without bothering about JSON representation of option type. Don't forget to add the converter 😅

```csharp
            services.AddNewtonsoftJson(
                    options =>
                    {
                        ...
                        options.SerializerSettings.Converters.Add(new OptionConverter.OptionConverter());
                    })
```
## 3. Dapper in F# - small wrapper to make use of it easy
Using dapper in F# is easy but if you are about to use asynchronous IO then you will have to deal with C# Task by writing `Async.AwaitTask : Task<'a> → Async<'a>`. This function translates a Task value to an Async value. Dapper is itself written in C# so you know the reason.
Example pure dapper example:
```fsharp
    let insertNewReportWithoutDapper (createSqlConnection: unit -> Async<SqlConnection>) newReport =
        let (SalesInvoicesReportId reportId) = newReport.Id
        async {
            use! sqlConnection = createSqlConnection ()
            do! sqlConnection.ExecuteAsync("INSERT INTO [Accounting].[SalesReport](Id, OpenedAt) VALUES(@Id, @OpenedAt)",
                                           {| Id = reportId; OpenedAt = newReport.OpenedAt |})
                |> Async.AwaitTask
                |> Async.Ignore
            }
```
With our wrapper which I will show you next it will be possible to write operations with SqlConnection in more F# friendly way which will increase code readibility. The same example with our wrapper:
```fsharp
    let insertNewReport createSqlConnection newReport =
        let (SalesInvoicesReportId reportId) = newReport.Id
        async {
            use! sqlConnection = createSqlConnection ()
            do! sqlConnection |> dbParamatrizedExecute
                       "INSERT INTO [Accounting].[SalesReport](Id, OpenedAt) VALUES(@Id, @OpenedAt)"
                       {| Id = reportId; OpenedAt = newReport.OpenedAt |}
              }
```
Much cleaner isn't it? Here's the wrapper code inspired by Roman Provazník gist [2] but with a focus on async methods.
```fsharp
namespace FSharpDapperWrapper

open System.Data
open System.Data.SqlClient
open Dapper

module DapperFSharp =
    let dbQuery<'Result> (query: string) (connection: SqlConnection): Async<'Result seq> =
        connection.QueryAsync<'Result>(query) |> Async.AwaitTask

    let dbQueryMultiple (query: string) (connection: SqlConnection): Async<SqlMapper.GridReader> =
        connection.QueryMultipleAsync(query) |> Async.AwaitTask

    let dbParametrizedQueryMultiple (query: string) (param: obj) (connection: SqlConnection): Async<SqlMapper.GridReader> =
        connection.QueryMultipleAsync(query, param) |> Async.AwaitTask

    let dbParamatrizedQuery<'Result> (query: string) (param: obj) (connection: SqlConnection): Async<'Result seq> =
        connection.QueryAsync<'Result>(query, param) |> Async.AwaitTask

    let dbParamatrizedExecute (sql: string) (param: obj) (connection: SqlConnection) =
        connection.ExecuteAsync(sql, param)
        |> Async.AwaitTask
        |> Async.Ignore

    let createSqlConnection connectionString =
        OptionHandler.RegisterTypes() // This option handler translates null to None when reading, and None to null when writing. More in chapter 3.1.
        async {
            let connection = new SqlConnection(connectionString)
            if connection.State <> ConnectionState.Open then do! connection.OpenAsync() |> Async.AwaitTask
            return connection
        }

    type Dapper.SqlMapper.GridReader with
        member reader.Read<'a>() = reader.ReadAsync<'a>() |> Async.AwaitTask
```
Having a factory method for SQL connection we can make our [CompositionRoot described in Part 1 complete](../2020-06-14-fsharp_with_csharp):
```csharp
Func<FSharpAsync<SqlConnection>> fSqlConnectionFactory =
    () => DapperFSharp.createSqlConnection(_appSettings.ConnectionString);
```
This is the "magical" `_fSqlConnectionFactory` that I left without going into details in the previous post. 
#### 3.1 Dapper in F# - mapping from null to None.
The next step to have Dapper in our functional world is about mapping null to None when reading the data (we don't want nulls right?) and None to null when writing. The code explains itself:

```fsharp
namespace FSharpDapperWrapper
open Dapper
open System

type OptionHandler<'T> () =
    inherit SqlMapper.TypeHandler<option<'T>> ()

    override __.SetValue (param, value) =
        let valueOrNull =
            match value with
            | Some x -> box x
            | None   -> null
        param.Value <- valueOrNull

    override __.Parse value =
        if Object.ReferenceEquals(value, null) || value = box DBNull.Value
        then None
        else Some (value :?> 'T)

module OptionHandler =
    let RegisterTypes () =
        SqlMapper.AddTypeHandler (OptionHandler<bool>())
        SqlMapper.AddTypeHandler (OptionHandler<byte>())
        SqlMapper.AddTypeHandler (OptionHandler<sbyte>())
        SqlMapper.AddTypeHandler (OptionHandler<int16>())
        SqlMapper.AddTypeHandler (OptionHandler<uint16>())
        SqlMapper.AddTypeHandler (OptionHandler<int32>())
        SqlMapper.AddTypeHandler (OptionHandler<uint32>())
        SqlMapper.AddTypeHandler (OptionHandler<int64>())
        SqlMapper.AddTypeHandler (OptionHandler<uint64>())
        SqlMapper.AddTypeHandler (OptionHandler<single>())
        SqlMapper.AddTypeHandler (OptionHandler<float>())
        SqlMapper.AddTypeHandler (OptionHandler<double>())
        SqlMapper.AddTypeHandler (OptionHandler<decimal>())
        SqlMapper.AddTypeHandler (OptionHandler<char>())
        SqlMapper.AddTypeHandler (OptionHandler<string>())
        SqlMapper.AddTypeHandler (OptionHandler<Guid>())
        SqlMapper.AddTypeHandler (OptionHandler<DateTime>())
        SqlMapper.AddTypeHandler (OptionHandler<DateTimeOffset>())
        SqlMapper.AddTypeHandler (OptionHandler<TimeSpan>())
        SqlMapper.AddTypeHandler (OptionHandler<DateTimeOffset>())
        SqlMapper.AddTypeHandler (OptionHandler<obj>())
```
Now you can use dapper in F# without worries! Let me show you two examples;

Samples:
```fsharp
    let storeCustomer createSqlConnection customer =
        async {
            use! sqlConnection = createSqlConnection()
            do! sqlConnection
                |> dbParamatrizedExecute """
INSERT INTO [Customers]
( Id,  Name,  Surname,  Email) VALUES
(@Id, @Name, @Surname, @Email)
        """ (DbCustomer.fromDomain customer)
        }

    let readCustomerWithOrders createSqlConnection customerId =
        async {
            use! sqlConnection = createSqlConnection()
            let (CustomerId reportId) = customerId
            let! resultSet = sqlConnection
                                |> dbParametrizedQueryMultiple """
SELECT Id, Name, Surname, Email FROM [Customers] WHERE [Id] = @Id
SELECT
Id,
Name,
Price,
OrderedDate
FROM [Orders]
WHERE CustomerId = @Id
        """ {|Id = customerId|}
            let! dbCustomer = resultSet.Read<DbCustomer>()
            let! dbOrders = resultSet.Read<DbOrder>()
            return (dbCustomer |> Seq.head |> DbCustomer.toDomain,
                    dbOrders |> Seq.map(fun order -> DbOrder.toDomain order)
                             |> Seq.toList
                   )
        } 
```
Poof... that's it!

## 5. Summary
Handling null and option type mismatch is quite easy and intuitive. Dapper required more effort but still, these are just two files - once you have them, they just work. With the previous article about composing dependencies, you have now full power to write C# hosting project with F# projects starting from the application layer, through the domain to different adapters including querying data with dapper. May the F#orce be with you!
- - -
<small>
<b>References:</b><br/>
Websites:<br/>

[1] [Lev Gorodinski blog and his code about different type converters](http://gorodinski.com/blog/2013/01/05/json-dot-net-type-converters-for-f-option-list-tuple/) <br/>
[2] [Roman Provazník gist with Dapper wrapper](https://gist.github.com/Dzoukr/d88f8ee3af400b7674d0393adfb85f1f) <br/>
