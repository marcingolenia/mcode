---
templateKey: blog-post
title: >-
  F# Dependency Injection - how to compose dependencies with partial application and don't fail with tests
date: 2020-12-11T19:35:00.000Z
description: >-
  One question you might ask yourself before starting a bigger project in F# How to inject dependencies? Let me show you how we used partial application to achieve loosely coupled testable components that can be tested in isolation or together in a broader perspective (acceptance tests). I will use Giraffe as the host, but the technique is free from any framework dependencies.
featuredpost: false
featuredimage: /img/root_tree_m.png
tags:
  - 'F#'
---

> This post is part of the F# Advent Calendar 2020. Special thanks to Sergey Tihon for organizing this! [Check out all the other great posts there!](https://sergeytihon.com/2020/10/22/f-advent-calendar-in-english-2020/).

## 1. Introduction
First, let me make sure that you know what composition root is. I will take the definition from Dependency Injection Principles, Practices, and Patterns book [1]:

> DEFINITION: A Composition Root is a single, logical location in an application where modules are composed together [1].

It also answers the important question "Where should we compose object graphs?" - "As close as possible to the application's entry point.

Let's create such a place in the Giraffe F# based project [(a functional ASP.NET Core micro web framework [2])](https://github.com/giraffe-fsharp/Giraffe) together with .NET 5.0. We will be using the partial application to achieve our goal. Note that in functional programming we can also try different techniques: "Reader Monad" and the "Free Monad" but these techniques are far harder. I will tackle them in the future on my blog.

#### 1.1 Why this post?
The post is heavily inspired by Scott Wlaschin's post about Dependency Injection in F# [2]. It is great! It will give you strong fundaments on the topic. Mine post focuses heavily on implementation, Scott's more on the partial application as IoC technique in general so make sure you read it and please come back - I have some answers for you once you will try to implement the described solution in a real project. There is a comment in the post by Konstantin at the bottom of the page. He asks about unit, integration, Acceptance Tests, and how it may look like in F# - I have the answer here. 
Also when I started to implement IoC at my work we quickly run into issues with testing that were caused by one piece composition root. I came across StackOverflow issue [3] which addressed my problem. It took me on the right track which I wanted to describe in the post. To fully understand the issue we have to face the problem first.

#### 1.2 The sample solution
Everything is based on real code which is available on GitHub here: https://github.com/marcingolenia/FsharpComposition. You might want to clone the repository, to see how it is done. 100% real stuff, no bullshit:
* .NET 5.0 with Giraffe based API.
* Docker with PostgreSql + script that creates database and table (you have to run it by yourself).
* Thoth.json for serializing objects. I like NoSQL in SQL :)
* Composing dependencies using composition root and partial application that uses settings read from JSON file
* Unit tests, integration tests, acceptance tests with FsUnit
* Nice fake for HttpContext which allows e2e testing with Giraffe.
* Id generation like Twitter Snowflake
* Sample usage of FsToolkit.ErrorHandling for `Async<Result<,>>` code.
* Demonstrates simple design of functional core, imperative shell. See point 7 for more.

I made this for you :) Don't hesitate to use it or submit a PR with improvements!

## 2. Domain, application layer and httpHandler
Let's imagine the following use case:
1. Create a stock item with the name and amount of available items.
2. Read the created item.

Besides, we will have some settings read from the json file (there are always some settings in the file right?) which composition root will use when composing up the dependencies to provide database connectivity or id generation.

Easy? Of course!

Let's start with an extra easy domain `StockItem.fs` (don't bother with the remove function - it is homework for you, I will mention it later):
```fsharp
namespace Stock

module StockItem =
    
    type StockItemErrors = | OutOfStock | CannotReadStockItem
    type StockItemId = StockItemId of int64
    
    type StockItem = {
        Id: StockItemId
        Name: string
        AvailableAmount: int
    }
        
    let create id name amount =
       { Id = id; Name = name; AvailableAmount = amount }
       
    let (|GreaterThan|_|) k value = if value <= k then Some() else None
        
    let remove (stockItem: StockItem) amount: Result<StockItem, StockItemErrors> =
        match amount with
        | GreaterThan stockItem.AvailableAmount ->
            { stockItem with AvailableAmount = stockItem.AvailableAmount - amount } |> Ok
        | _ -> OutOfStock |> Error
```
Now let me present you the code that has the use cases `StockItemWorkflows.fs` (application layer):
```fsharp
namespace Stock.Application

open Stock.StockItem
open FsToolkit.ErrorHandling

module StockItemWorkflows =
    type IO = {
        ReadBy: StockItemId -> Async<Result<StockItem, string>>
        Update: StockItem -> Async<unit>
        Insert: StockItem -> Async<unit>
    }
       
    let remove io id amount: Async<Result<unit, StockItemErrors>> =
        asyncResult {
            let! stockItem = io.ReadBy (id |> StockItemId) |> AsyncResult.mapError(fun _ -> CannotReadStockItem)
            let! stockItem = remove stockItem amount
            do! io.Update stockItem
        }
    
    let create io id name capacity: Async<unit> =
        create (id |> StockItemId) name capacity
        |> io.Insert
```
and one query in the same layer (let's separate queries from commands ok?) `StockItemById.fs`
```fsharp
module Queries.StockItemById

type Query = bigint

type Result = {
    Id: int64
    Name: string
    AvailableAmount: int
}
```
Let me skip the data access functions - their internal implementation is not important. If you want you can take a look at the code yourself. Having that code let's see `httpHandler.fs`;

```fsharp
namespace Api

open Api.Dtos
open FlexibleCompositionRoot
open Stock.StockItem
open Giraffe
open Microsoft.AspNetCore.Http
open FSharp.Control.Tasks.V2.ContextInsensitive

module HttpHandler =
    let queryStockItemHandler queryStockItemBy (id: int64): HttpHandler =
        fun (next: HttpFunc) (ctx: HttpContext) ->
            task {
                let! stockItem = queryStockItemBy (id |> Queries.StockItemById.Query)
                return! match stockItem with
                        | Some stockItem -> json stockItem next ctx
                        | None -> RequestErrors.notFound (text "Not Found") next ctx
            }
            
    //let removeFromStockItem ... (not important at the moment)

    let createStockItemHandler createStockItem (createId: unit -> int64): HttpHandler =
        fun (next: HttpFunc) (ctx: HttpContext) ->
            let id = createId()
            task {
                let! stockItemDto = ctx.BindJsonAsync<CreateStockItemDto>()
                do! createStockItem id stockItemDto.Name stockItemDto.Amount
                ctx.SetHttpHeader "Location" (sprintf "/stockitem/%d" id)
                return! Successful.created (text "Created") next ctx
            }

    let router (compositionRoot: ???): HttpFunc -> HttpContext -> HttpFuncResult =
        choose [ GET >=> route "/" >=> htmlView Views.index
                 GET >=> routef "/stockitem/%d" (queryStockItemHandler compositionRoot.QueryStockItemBy)
                 PATCH >=> route "/stockitem/" >=> (removeFromStockItem compositionRoot.RemoveFromStock) 
                 POST >=> route "/stockitem/" >=> (createStockItemHandler compositionRoot.CreateStockItem compositionRoot.GenerateId)
                 setStatusCode 404 >=> text "Not Found" ]
```
I have placed three question marks - that is what we gonna do now.

## 3. Inflexible Composition root implementation
Let's start with the `>=> GET >=> routef "/stockitem/%d"` route. If you have read the Scott's post[2] you should end up with something like that (at least the type should match);
`InflexibleCompositionRoot.fs`
```fsharp
  type InflexibleCompositionRoot =
    { QueryStockItemBy: Queries.StockItemById.Query -> Async<Queries.StockItemById.Result option> }

  let compose settings =
    let createSqlConnection = DapperFSharp.createSqlConnection settings.SqlConnectionString
    { QueryStockItemBy = StockItemQueryDao.readBy createSqlConnection }
```
This is basic stuff. Let me just show you the settings; 

```fsharp
module Settings

[<CLIMutable>]
type Settings = {
    SqlConnectionString: string
    IdGeneratorSettings: IdGenerator.Settings // we will use it for creating stock item
}
```
If you will add asppsettings.json to the solution (make sure to have it copied on build - set that in fsproj) you can create the composition root in `Program.fs` read the settings and pass it to the router. This is how I do it;
`Program.fs`
```fsharp
module Api.App
//... Some code that is not important now
//...
[<EntryPoint>]
let main args =
    let contentRoot = Directory.GetCurrentDirectory()
    let webRoot     = Path.Combine(contentRoot, "WebRoot")
    let confBuilder = ConfigurationBuilder() |> configureSettings
    let root        = InflexibleCompositionRoot.compose (confBuilder.Build().Get<Settings>())
    Host.CreateDefaultBuilder(args)
        .ConfigureWebHostDefaults(
            fun webHostBuilder ->
                webHostBuilder
                    .UseContentRoot(contentRoot)
                    .UseWebRoot(webRoot)
                    .Configure(Action<IApplicationBuilder> (configureApp root))
                    .ConfigureServices(configureServices)
                    .ConfigureLogging(configureLogging)
                    |> ignore)
        .Build()
        .Run()
    0
```
And you are good to go! Before we identify the problem let me add dependencies to the `POST >=> route "/stockitem/" >=>` route. 
`InflexibleCompositionRoot.fs`
```fsharp
  type InflexibleCompositionRoot =
    { QueryStockItemBy: Queries.StockItemById.Query -> Async<Queries.StockItemById.Result option>
      CreateStockItem: int64 -> string -> int -> Async<unit>
      GenerateId: unit -> int64
    }

  let compose settings =
    let createSqlConnection = DapperFSharp.createSqlConnection settings.SqlConnectionString
    let idGenerator = IdGenerator.create settings.IdGeneratorSettings
    let stockItemWorkflowsIo: StockItemWorkflows.IO = {
      Insert = StockItemDao.insert createSqlConnection
    }
    {
      QueryStockItemBy = StockItemQueryDao.readBy createSqlConnection
      CreateStockItem = StockItemWorkflows.create stockItemWorkflowsIo
      GenerateId = idGenerator
    }
```
Again, if you are interested in IdGenerator please see the code by yourself. Having this we can already:
1. Start the app and fire POST  to create the stock item.
2. Receive a nice Location header in the response.
3. Get the id from the header and query for the stock item that we've created.

So what's the fuss? 

## 4. Problems with the inflexible implementation - Testing

Testing is the problem. Note the signature of `CreateStockItem` function from Composition root: `CreateStockItem: int64 -> string -> int -> Async<unit>`. It just takes int64 (id), string (name) and int (amount) and returns asynchronously nothing. We are forced to use the database in our acceptance tests. You are still able to write unit tests for the domain or integration tests for data access objects (DAOs) including database interaction. There are such tests in the repo.

Maybe sometimes you want to write acceptance tests with all the dependencies included but sometimes you won't (external services calls - do you want to have your tests failed because not-your service in the test environment is down?). Let me give you the clarification in code...

#### 4.1 Acceptance tests
I will skip the integration test and unit test - they are too easy for us. Let's write the acceptance test for the use case. Reminder:
>Let's imagine the following use case: Create a stock item with the name and amount of available items and Read the created item.

`Tests1.fs`
```fsharp
module Tests1

open System
open Api
open Dtos
open Microsoft.AspNetCore.Http
open Xunit
open HttpContext
open FSharp.Control.Tasks.V2
open FsUnit.Xunit
open TestInflexibleCompositionRoot

[<Fact>]
let ``GIVEN stock item was passed into request WHEN CreateStockItem THEN new stockitem is created and location is returned which can be used to fetch created stockitem`` () =
    // Arrange
    let (name, amount) = (Guid.NewGuid().ToString(), Random().Next(1, 15))
    let httpContext = buildMockHttpContext ()
                      |> writeObjectToBody {Name = name; Amount = amount}
    // Act
    let http =
        task {
            let! ctxAfterHandler = HttpHandler.createStockItemHandler testRoot.CreateStockItem testRoot.GenerateId next httpContext 
            return ctxAfterHandler
        } |> Async.AwaitTask |> Async.RunSynchronously |> Option.get
    // Assert
    http.Response.StatusCode |> should equal StatusCodes.Status201Created
    let createdId = http.Response.Headers.["Location"].ToString().[11..] |> Int64.Parse
    let httpContext4Query = buildMockHttpContext ()
    let httpAfterQuery =
        task {
            let! ctxAfterQuery = HttpHandler.queryStockItemHandler testRoot.QueryStockItemBy createdId next httpContext4Query
            return ctxAfterQuery
        } |> Async.AwaitTask |> Async.RunSynchronously |> Option.get
    let createdStockItem = httpAfterQuery.Response |> deserializeResponse<Queries.StockItemById.Result>
    createdStockItem.Id |> should equal createdId
    createdStockItem.Name |> should equal name
    createdStockItem.AvailableAmount |> should equal amount
```
The `buildMockHttpContext ()` it's not that important at the moment - but it creates a fake HttpContext that allows playing with the message body, headers, query string. It is handy - grab the implementation from the repo and take it to the broad world. 
Note I am passing a function (a use case from the application layer) from the composition root to our HttpHandler. I have created the `testRoot` before. It's easy:
`TestInflexibleCompositionRoot.fs`
```fsharp
module TestInflexibleCompositionRoot

open System
open InflexibleCompositionRoot
open Settings
let testSettings: Settings =
    // We are forced to test against database
    { SqlConnectionString = "Host=localhost;User Id=postgres;Password=Secret!Passw0rd;Database=stock;Port=5432"
      IdGeneratorSettings =
          { GeneratorId = 555
            Epoch = DateTimeOffset.Parse "2020-10-01 12:30:00"
            TimestampBits = byte 41
            GeneratorIdBits = byte 10
            SequenceBits = byte 12 } }

let testRoot = compose testSettings
```
**There is no place we can fake** the `StockItemDao.insert createSqlConnection`. Do you see it? Database communication is a must! In this case, this is just the database that we control but this can be simply anything! All kinds of IO here. The IO operations are hidden by the composition root - that's the real problem. 

The alternative is to compose the function without the composition root and pass it to the httpHandler. Ok that is not that so bad but it has two significant drawbacks:
* You don't test your dependency tree because you are composing dependencies in your tests, not in the code that runs on production.
* Maintenance cost of such a solution is high - when you change the dependencies you have to go to tests and adjust the implementation. Each time.

Let me show you now implementation of a more flexible composition root.

## 5. Flexible Composition root implementation
I didn't get the proposed solution on SO question [3] at first. I came up with a metaphor that helped me to explain it to others once I did. Let me know explain it to you. 

So... CompositionRoot... what have roots? Right! A tree. Imagine that we have to build the tree now and let's start from the top. Bear with me, once we go through you will get the idea!

#### 5.1 Leaves
Leaves are the IO operations associated with different kinds of dependencies side effects. Databases, Http, WCF... you name the next one. We should have them a lot of, to have a decent tree! For us, it will be the `QueryStockItemBy` and `GenerateId` and the 3 functions from the `StockItemWorkflows.IO` type.
![](img/leaves.png)

#### 5.2 Trunk
The trunk will take all of those dependencies into one place. The trunk will be a support for our leaves. Settings will be passed right into the trunk and the trunk will distribute the proper pieces of settings into the leaves. 
![](img/tree.png)


#### 5.3 Root
The Root will hide all the complexity. Having the root we will be able to call the right "workflow" and then it will go through the tunk to the leaves. This root will be almost identical to the composition root that we already implemented.
![](img/root_tree.png)

* Leaves = workflows IO dependencies
* Trunk = host of all the Leaves + common IO dependencies needed in different places (like id generation).
* Root = proper composition root.

Now let me show you the implementation. After that, I will show you the benefits of it in the tests. I used to structure the flexible composition root like this;
![](img/flex_root.png)

One of the leaves may look just like that; 
`StockItemWorkflowsDependencies.fs`
```fsharp
namespace Api.FlexibleCompositionRoot.Leaves

open System.Data
open Stock.Application
open Stock.PostgresDao

module StockItemWorkflowDependencies =
    let compose (createDbConnection: unit -> Async<IDbConnection>) : StockItemWorkflows.IO =
        {
            ReadBy = StockItemDao.readBy createDbConnection
            Update = StockItemDao.update createDbConnection
            Insert = StockItemDao.insert createDbConnection
        }
```
You will have a lot of leaves in a more complex solution. There will be one trunk, which may look like this:
`Trunk.fs`
```fsharp
namespace Api.FlexibleCompositionRoot

open Settings
open Stock.Application
open Stock.PostgresDao 

module Trunk = 
    type Trunk =
        {
            GenerateId: unit -> int64
            StockItemWorkflowDependencies: StockItemWorkflows.IO
            QueryStockItemBy: Queries.StockItemById.Query -> Async<Queries.StockItemById.Result option>
        }
        
    let compose (settings: Settings) =
        let createDbConnection = DapperFSharp.createSqlConnection settings.SqlConnectionString
        {
            GenerateId = IdGenerator.create settings.IdGeneratorSettings
            StockItemWorkflowDependencies = Leaves.StockItemWorkflowDependencies.compose createDbConnection
            QueryStockItemBy = StockItemQueryDao.readBy createDbConnection
            // Your next application layer workflow dependencies ...
        }
```
And finally the composition root;
`FlexibleCompositionRoot.fs`
```fsharp
module FlexibleCompositionRoot
  open Api.FlexibleCompositionRoot
  open Stock.Application
  open Stock.StockItem

  type FlexibleCompositionRoot =
    { QueryStockItemBy: Queries.StockItemById.Query -> Async<Queries.StockItemById.Result option>
      RemoveFromStock: int64 -> int -> Async<Result<unit, StockItemErrors>>
      CreateStockItem: int64 -> string -> int -> Async<unit>
      GenerateId: unit -> int64
    }
    
  let compose (trunk: Trunk.Trunk) =
    {
      QueryStockItemBy = trunk.QueryStockItemBy
      RemoveFromStock = StockItemWorkflows.remove trunk.StockItemWorkflowDependencies
      CreateStockItem = StockItemWorkflows.create trunk.StockItemWorkflowDependencies
      GenerateId = trunk.GenerateId
    }
```
Building such dependency tree is still strightforward, let me show you the `Program.fs` part that is responsible for this:
```fsharp
<EntryPoint>]
let main args =
    let contentRoot = Directory.GetCurrentDirectory()
    let webRoot     = Path.Combine(contentRoot, "WebRoot")
    let confBuilder = ConfigurationBuilder() |> configureSettings
    // old way -> let root        = InflexibleCompositionRoot.compose (confBuilder.Build().Get<Settings>())
    let trunk       = Trunk.compose (confBuilder.Build().Get<Settings>())
    let root        = FlexibleCompositionRoot.compose trunk
    Host.CreateDefaultBuilder(args)
        .ConfigureWebHostDefaults(
            fun webHostBuilder ->
                webHostBuilder
                    .UseContentRoot(contentRoot)
                    .UseWebRoot(webRoot)
                    .Configure(Action<IApplicationBuilder> (configureApp root))
                    .ConfigureServices(configureServices)
                    .ConfigureLogging(configureLogging)
                    |> ignore)
        .Build()
        .Run()
    0
```
## 6. Testing with flexible composition root
It's time to see the benefits of such a structured composition root. We still write unit and integration tests in the same way. You can still write the acceptance tests in the same way or you can pass your custom-defined functions to form the dependency tree. We only have to be sure that the custom function has the same signature. That's a cool feature of functional programming that the function automatically behaves like an interface (first-class functions). Let's write a small helper that will support passing the custom functions as dependencies.
`TestFlexibleCompositionRoot.fs`
```fsharp
module TestFlexibleCompositionRoot

open System
open Api.FlexibleCompositionRoot
open FlexibleCompositionRoot
open Settings
let testSettings: Settings =
    // We can test with database but we don't have to.
    { SqlConnectionString = "Host=localhost;User Id=postgres;Password=Secret!Passw0rd;Database=stock;Port=5432"
      IdGeneratorSettings =
          { GeneratorId = 555
            Epoch = DateTimeOffset.Parse "2020-10-01 12:30:00"
            TimestampBits = byte 41
            GeneratorIdBits = byte 10
            SequenceBits = byte 12 } }

let composeRoot tree = compose tree
let testTrunk = Trunk.compose testSettings

let ``with StockItem -> ReadBy`` substitute (trunk: Trunk.Trunk) =
  { trunk with StockItemWorkflowDependencies = { trunk.StockItemWorkflowDependencies with ReadBy = substitute } }
  
let ``with StockItem -> Update`` substitute (trunk: Trunk.Trunk) =
  { trunk with StockItemWorkflowDependencies = { trunk.StockItemWorkflowDependencies with Update = substitute } }
  
let ``with StockItem -> Insert`` substitute (trunk: Trunk.Trunk) =
  { trunk with StockItemWorkflowDependencies = { trunk.StockItemWorkflowDependencies with Insert = substitute } }

let ``with Query -> StockItemById`` substitute (trunk: Trunk.Trunk) =
  { trunk with QueryStockItemBy = substitute }
```

This gives us very sexy intellisense: 
![](img/root_inteli.png)

Time to rewrite our acceptance tests which checks the creation of the stock item. I already have tests with SQL queries in the dedicated project, so let's cut off the database dependencies:
`Tests2.fs`
```fsharp
module Tests2

open System
open Api
open Dtos
open Microsoft.AspNetCore.Http
open Stock.StockItem
open Xunit
open HttpContext
open FSharp.Control.Tasks.V2
open FsUnit.Xunit
open TestFlexibleCompositionRoot

[<Fact>]
let ``GIVEN stock item was passed into request WHEN CreateStockItem THEN new stock item is created and location is returned which can be used to fetch created stock item`` () =
    // Arrange
    let (name, amount) = (Guid.NewGuid().ToString(), Random().Next(1, 15))
    let httpContext = buildMockHttpContext ()
                      |> writeObjectToBody {Name = name; Amount = amount}
    // Data mutation needed instead database operations:
    let mutable createdStockItem: StockItem option = None
    let root = testTrunk
               // first faked function:
               |> ``with StockItem -> Insert`` (fun stockItem -> async { createdStockItem <- Some stockItem; return () })
               // second faked function:
               |> ``with Query -> StockItemById`` (fun _ ->
                   async {
                       let stockItem = createdStockItem.Value
                       let (StockItemId id) = stockItem.Id
                       return ( Some {
                           Id = id
                           AvailableAmount = stockItem.AvailableAmount
                           Name = stockItem.Name
                       }
                               : Queries.StockItemById.Result option)
                   })
               |> composeRoot
    // Act
    let http =
        task {
            let! ctxAfterHandler = HttpHandler.createStockItemHandler root.CreateStockItem root.GenerateId next httpContext 
            return ctxAfterHandler
        } |> Async.AwaitTask |> Async.RunSynchronously |> Option.get
    // Assert
    http.Response.StatusCode |> should equal StatusCodes.Status201Created
    let createdId = http.Response.Headers.["Location"].ToString().[11..] |> Int64.Parse
    let httpContext4Query = buildMockHttpContext ()
    let httpAfterQuery =
        task {
            let! ctxAfterQuery = HttpHandler.queryStockItemHandler root.QueryStockItemBy createdId next httpContext4Query
            return ctxAfterQuery
        } |> Async.AwaitTask |> Async.RunSynchronously |> Option.get
    let createdStockItem = httpAfterQuery.Response |> deserializeResponse<Queries.StockItemById.Result>
    createdStockItem.Id |> should equal createdId
    createdStockItem.Name |> should equal name
    createdStockItem.AvailableAmount |> should equal amount
```
That was a long way, wasn't it? Once you will try this approach you will stick to it believe me - the flexibility you have while writing your tests is worth it. 

## 7. Wait! Isn't that a service locator that you do in HttpHandlers? 
Let's look again into the DI book [1] to bring the definition
> A Service Locator supplies application components outside the Composition Root with access to an unbounded set of Volatile Dependencies.

And learn the service locator pattern negative effects:
1. The class drags along the Service Locator as a redundant dependency. 
2. The class makes it non-obvious what its Dependencies are. 

In contradiction our composition root:
1. Guarantees that application components have no access to an unbounded set of Volatile Dependencies. 
2. CompositionRoot is not dragged around as redundant dependency. All of the CompositionRoot members should be used - so we are far from "redundant".
3. All dependencies of our top-level component (HttpHandler) limit to the CompositionRoot and it is *obvious* that we want to associate specific "workflows" with given handlers. The "workflows" dependencies are obvious and explicit.

## 7. Impure/pure sandwich aka imperative shell 
Before I write some conclusions, let me emphasize one thing here. This approach works extremely well with the imperative shell and functional core. You can read more on Mark Seeman's blog [4] and Gary Bernhardt's presentation [5]. In short: It is about moving the side effects functions to boundaries of the workflows (no `Async` in the domain, no synchronous operations which cause state changes elsewhere - for example in the database). This approach makes testing far easier, you get easy multithreading for IO stuff and makes reasoning about the program's state over much easier. 3 times easy! Do it!

## 8. Conclusions
I use this approach in my current project, the team is happy with both - testing strategy and the way the dependencies are being composed. By treating the composition root as a tree with leaves, trunk, and roots we can segregate our concerns - functions with side effects from pure functions. Note that I have used Giraffe as the host, but the composition root is free from any framework references. You should be able to use this way in any F# project.

#### 8.1 Two small pieces of advice that can help you in the future
1. When your composition root will keep growing, consider making more roots. This will help you reason about dependencies. Remember that Composition Root is a single place, not a single type. 
2. I've created a record type in StockItemWorkflows for IO Dependencies. Feel free to skip it - if you have one or two dependencies you may simply pass the functions with the right signature (like Scott does in his post [2]).

## 9. EXTRA: Homework!
Try to write an acceptance test for removing items from the stock in both approaches. I wrote the "production code" for you already. This will fully help you understand how to do it. This approach works extremely well with TDD as well - try to extend the functionality with one more use-case; adding items to the stock, but write the tests first.
- - -
<b>References:</b><br/>
Websites: <br/>

[1] [*Dependency Injection Principles, Practices, and Patterns* by Mark Seeman](https://www.goodreads.com/book/show/44416307-dependency-injection-principles-practices-and-patterns) <br/>
[2] [*Functional approaches to dependency injection* by Scott Wlaschin](https://fsharpforfunandprofit.com/posts/dependency-injection-1/) <br/>
[3] [Stack overflow question: F# analog of dependency injection for a real project](https://stackoverflow.com/questions/52156730/f-analog-of-dependency-injection-for-a-real-project) <br/>
[4] [Impureim sandwich by Mark Seemann](https://blog.ploeh.dk/2020/03/02/impureim-sandwich/)<br/>
[5] [Functional Core Imperative Shell by Gary Bernhardt](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell)