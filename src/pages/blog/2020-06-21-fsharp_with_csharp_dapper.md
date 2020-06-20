---
templateKey: blog-post
title: >-
  Make F# play nice with C# Part 2 - how to handle option and nullable mismatch and work with dapper
date: 2020-06-21T21:41:11.000Z
description: >-
  This is the next part of the C# and F# integration journey. This time we will look into Dapper functional wrapper and option vs nullable type mismatch. Together with the previous post, we will close the loop of C# and F# coexistence. 
featuredpost: true
featuredimage: /img/cf.png
tags:
  - 'F#'
  - 'C#'
---
## 1. Introduction
If you are interested just in making dapper more usable in F# or conversion between F# option <-> C# Nullable then this is the article for you. However, if you are looking for how-to integrate C# with F# in general you should also read my previous article about [composing dependencies in C# and F# hybrid solution](../2020-06-14-fsharp_with_csharp).

## 2. Nullable to option, option to nullable
```fsharp
module NullableOptionUtil

let ToOption (n: System.Nullable<_>) =
    if n.HasValue then Some n.Value else None

let StringToOption(n: string) =
    if System.String.IsNullOrEmpty(n) then None else Some n

let ToNullable (n: option<'a>) =
    if n.IsSome then new System.Nullable<'a>(n.Value) else new System.Nullable<'a>()

```

## 3. Dapper in F#

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
        OptionHandler.RegisterTypes()
        async {
            let connection = new SqlConnection(connectionString)
            if connection.State <> ConnectionState.Open then do! connection.OpenAsync() |> Async.AwaitTask
            return connection
        }

    type Dapper.SqlMapper.GridReader with
        member reader.Read<'a>() = reader.ReadAsync<'a>() |> Async.AwaitTask
```

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

## 5. Summary
Handling null and option type mismatch is quite easy and intuitive. Dapper required more effort but still, these are just two files - once you have them, they just work. With the previous article about composing dependencies, you have now full power to host F# projects starting from the application layer, through the domain to different adapters including querying data with dapper. May the F#orce be with you!
- - -

<small>
<b>Footnotes:</b><br/>
[2] Foot 1<br/>
<br/><b>References:</b><br/>
Websites:<br/>

[1] [link desc](https://link/pl) <br/>

https://gist.github.com/Dzoukr/d88f8ee3af400b7674d0393adfb85f1f