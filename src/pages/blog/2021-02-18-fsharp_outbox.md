---
templateKey: blog-post
title: >-
  Outbox pattern in F# with polling publisher
date: 2021-02-18T11:35:00.000Z
description: >-
  If you are implementing more than one service and you need to establish asynchronous communication in-between, or if you need bullet-proof asynchronous communication with 3rd party services the outbox pattern might be a handy tool. Let's look at how can we implement one in the beloved F#!
featuredpost: true
featuredimage: /img/outbox.png
tags:
  - 'F#'
  - Patterns
---
## 1. Introduction

Let's consider a simple use-case to give you a full understanding of when the outbox pattern can be useful. If you know this and that about it, feel free to skip the introduction. If you are eager to see the full source code here's the link: https://github.com/marcingolenia/fsharp-outbox.

I am not a fan of UML, but for learning or explanations it is just fine so let's try to use the sequence diagram to explain the problem to you step by step. Basic flow;
1. User places an order in the app.
2. The order is created and saved in the database.
3. An event is being published "order placed".
4. User is informed in the app "thank you for placing the order".
5. Event is being consumed, and invoice is prepared. 
6. Invoice is saved.
7. Happy end.

Let's say that invoicing is done by another service and another team. You agreed on the published language "order placed" to exchange the data. Next, let's keep things simple, and let's neglect the doubts you might have like "What about payments?" or "Why the invoice is not being sent?". I need to make you understand the outbox pattern, not to build a perfect business use-case. So you might plan to build something like this:

![](/img/outbox/outbox1.png)

And it should work in most cases, unless...

#### 1.1 The problem 
Unless the application will die just after saving the order in the database, or the message broker will not be reachable (network problems, any reason...):

![](/img/outbox/outbox2.png)

You might try to do things in a different order. What if we publish the message first, then we save changes in the database? As you can guess it is now possible to emit the message but the order won't be saved because the database can't be reached:

![](/img/outbox/outbox3.png)

Now we have to deal with an invoice for a not existing order. Of course, we can make our best to reduce the risk by introducing retries, but even with 100 retries eventually, you will meet the problem. 

#### 1.2 The solution
As you may guess (because of the title of the blog post) the solution here is to use the outbox pattern. You can also read a little bit about it on the microservices.io page [1] and related book [8]. If you do, please pay attention to the term ** High-level domain events**. What the hell is that? More important domain events? No - these are events that have to be distinguished from domain events as they directly cause side effects in different domains. I encourage you to name it differently. Kamil Grzybek in his article about the outbox pattern in C# [3] comes up with "domain notification". I like it, let's stick to this name. 

The idea behind the outbox is to create outbox storage in the same database you mutate the state and use a transaction to achieve atomicity. In other words; save the new order and save the "order placed" domain notification, if one of these operations fails, don't commit the transaction, so changes (if any) are rolled back. This mechanism is reflected in the pattern name: "Transactional Outbox". Then another process picks up the pending notification and distributes it in the desired way. I have made one sequence diagram more that shows this:

![](/img/outbox/outbox4.png)

Keep in mind one important thing - the outbox pattern helps to achieve "at least once delivery". In corner cases, you may end up with message duplicates (when a notification message is published and outbox storage goes down before "marking" the notification as processed). If you need exactly-once delivery you might google a little bit for the inbox pattern (or wait for my post in the future 😉). But make sure you can't go with Idemponent receiver - this guy will make your life simpler. You can read a general description here [4] and a more detailed one in the Enterprise Integration Patterns book [9].

Time to get serious and write some F# 💪

## 2. Outbox in F#'
We will need 2 functions to implement Outbox and a type to represent an outbox message.
```fsharp
  type OutboxMessage =
    { Id: int64
      OccuredOn: DateTime
      Payload: string
      Type: string }
```
The `Type: string` will help us deal with serialization/deserialization, the rest is obvious. Commit and execute functions:
```fsharp
type Commit = (unit -> int64) -> (OutboxMessage list -> Async<unit>) -> 'a list -> Async<unit>
type Execute = Async<seq<OutboxMessage>> -> (OutboxMessage -> Async<unit>) -> (obj -> Async<unit>) -> Async<unit>
```

1. Commit:
    * `(unit -> int64)` is a function that will generate identifiers for new outbox messages.
    * `(OutboxMessage list -> Async<unit>)` is a function that will store OutboxMessages list.
    * `'a list ` is list of notification (thank you F# for type inference, I love you).
    * `Async<unit>` we don't need nothing from the function as result - it is just a side effect.
2. Execute:
    * `Async<seq<OutboxMessage>>` is a sequence asynchronusly retrieved outbox messages.
    * `(OutboxMessage -> Async<unit>)` is a function that sets the message as processed.
    * `(obj -> Async<unit>)` is a function that publishes the message.
    * `Async<unit>` again - we don't need nothing from the function as result - it is just a side effect.

Now forget about the types - the anatomy is behind us and let us write
```fsharp
  let commit generateId save notifications = 
  ...
  let execute read setProcessed publish =
```
much easier isn't it? That is why I always argue (especially with my C# biased friends) that naming is more important that type annotation (some of them need to be convienced to use var). I have a good news to you - that was the hardest part. Let us complete the commit function:
```fsharp
  let commit generateId save notifications =
    let outboxMessages =
      notifications |> List.map (fun notification ->
        { Id = generateId()
          OccuredOn = DateTime.UtcNow
          Payload = JsonConvert.SerializeObject notification
          Type = notification.GetType().FullName })
    async { do! save outboxMessages }
```
Do I need to explain something here? I don't think so but just ask in comments if something bothers you. Let's look how execute can be implemented:
```fsharp
  let execute read setProcessed publish =
    async {
      let! (messages: OutboxMessage seq) = read 
      let notificationAssembly = Assembly.GetAssembly(typeof<Marker>)   
      let processes = messages |> Seq.map(fun message ->
        async {
                do! publish (JsonConvert.DeserializeObject(message.Payload, notificationAssembly.GetType(message.Type)))
                do! setProcessed message })
      do! processes |> Async.Sequential
                    |> Async.Ignore
    }
```
What is Marker? Marker is an empty interface to help us with assembly scanning and type solving. Just add this: 
```fsharp
type Marker = interface end
```
to the project with your domain notifications. Keep in mind that it can be anything - record, class, struct, whatever. Some developers like to force a convention for instance you must inherit from `INotification` interface. I don't like that - I see no benefit from it, but it's just my opinion. You may also ask why I decided to process the messages sequentially. Well... if we cannot publish the messages for any reason for some time, the pending outbox messages will keep growing. Firing thousands of messages in Parallel can be a bad idea. If you are sure you will handle the massive load, change it to Parallel - no problem. On GitHub [11] I have introduced a `ParallelizationThreshold` parameter so you can tune the behavior elegantly. 

Full source code can be found on GitHub [11]. The transactional outbox pattern is ready. We only need 2 types (including empty interface) and 2 functions - as simple as that. The rest are just dependencies and hosting. Let's look into that.

#### 2.1 Persistence dependencies
I have decided to use Postgres. As you can see I have decoupled the persistence from the outbox, so feel free to replace it with anything you want. 
First, let's create a schema for our outbox. It may look like this:
```sql
create table outbox_messages (
  id bigint constraint pk_outbox_messages primary key,
  occured_on timestamp not null,
  type varchar(255) not null,
  payload json not null
);

create table outbox_messages_processed (
  id bigint constraint pk_outbox_messages_processed primary key,
  occured_on timestamp not null,
  type varchar(255) not null,
  payload json not null,
  processed_on timestamp not null
);

```
You can store processed and not processed messages in one table and nullable column `processed_on` which will store processed date if already processed. I will stick to a very inspirational document [10] in which Hugh Darwen (who was working on the relation model since the beginning) puts forward alternative approaches by introducing specialized relations. Let's do that. One nice benefit of this approach is that we gain some segregation of concerns - one table for holding things to process and one table that is an archive. We can apply tailor-made indexes, partitioning, etc.

With small dapper wrapper (you can find it on github) the functions might look as foolows:
```fsharp
  let save createConnection outboxMessages =
    let cmd = "INSERT INTO outbox_messages(id, occured_on, payload, type) VALUES (@Id, @OccuredOn, @Payload::jsonb, @Type)"
    async {
      use! connection = createConnection ()
      do! connection |> sqlExecute cmd outboxMessages
    }

  let read createConnection =
    let cmd = "SELECT id, occured_on as OccuredOn, payload, type FROM outbox_messages" 
    async {
      use! connection = createConnection ()
      return! connection |> sqlQuery<OutboxMessage> cmd
    }

    let moveToProcessed createConnection outboxMessage =
      let cmd = "
        WITH moved_rows AS (
        DELETE FROM outbox_messages deleted
        WHERE Id = @id
        RETURNING deleted.* 
        )
        INSERT INTO outbox_messages_processed(id, occured_on, payload, type, processed_on)
        SELECT id, occured_on, payload, type, now() at time zone 'utc' FROM moved_rows;"
    async {
      use! connection = createConnection ()
      do! connection |> sqlExecute cmd {| id = outboxMessage.Id |}
    }
```
The two first functions are basic stuff. Let me comment on the last one. The `RETURNING` clause will help us to maintain the sql statement atomicity. If the record won't be able to be inserted, it won't be deleted. It works the same way in MSSQL Server (but with `OUTPUT` clause), regarding other RDBMS you have to check yourself.

Note that the functions signatures match the outbox `save`, `read`, `setProcessed` functions signatures.

#### 2.2 Publisher dependency

For publishing messages, I've decided to pull in a library that makes the underlying message broker just a matter of configuration, despite I decided to use RabbitMQ. I've picked up Rebus [6] just because I wanted to put my fingers on something new for me. In the past, I've also used MassTransit which is also great. To be honest, I like Rebus more now, the configuration is easier and it seems that (by a chance or not) fits better with F# compared to MassTransit (in the team we were not able to write consumers without implementing the `IConsumer<>` interface). Let me present some helping-functions to deal with message publishing and subscription:

```fsharp
namespace RebusMessaging

open System
open System.Threading.Tasks
open Rebus.Activation
open Rebus.Bus
open Rebus.Logging
open Rebus.Config

module Messaging =
    let private queueName = "mcode.fun"
    
    let private toTask asyncA =
      asyncA |> Async.StartAsTask :> Task
    
    let publish (bus: IBus) message =
      bus.Publish message |> Async.AwaitTask
        
    let configure (endpoint: string)
                  (connectionName: string)
                  (activator: BuiltinHandlerActivator)
                  =
      Configure.With(activator)
               .Transport(fun transport -> transport.UseRabbitMq(endpoint, queueName)
                                                    .ClientConnectionName(connectionName) |> ignore)
               .Logging(fun logConfig -> logConfig.Console(LogLevel.Info))
               .Start()
               
    let configureOneWay (endpoint: string)
                        (connectionName: string)
                        (activator: BuiltinHandlerActivator)
                        =
      Configure.With(activator)
               .Transport(fun transport -> transport.UseRabbitMqAsOneWayClient(endpoint)
                                                    .ClientConnectionName(connectionName) |> ignore)
               .Logging(fun logConfig -> logConfig.Console(LogLevel.Info))
               .Start()
               
    let registerHandler
      (handler: 'a -> Async<Unit>)
      (activator: BuiltinHandlerActivator) =
        activator.Handle<'a>(fun message -> handler message |> toTask)
    
    let markerNeighbourTypes<'marker> =
      (typeof<'marker>.DeclaringType).GetNestedTypes()
        |> Array.filter(fun type_ -> type_.IsAbstract = false)
    
    let turnSubscriptionsOn (types: Type[]) (bus: IBus) =
      async {
        types |> Array.iter(fun type_ -> bus.Subscribe type_ |> ignore)
      }
```
Let's talk about the code now.
* `toTask` function simply takes an asynchronous function, turns it to the hot task model, and converts it to task type. It is handy for registering event handlers (line 42).
* `publish` and `registerHandler` are simple wrappers to make the rebus methods calls sexier in F# code. 
* `configure` and `configureOneWay` deal with configuration. Here you can implement a simple if-statement to connect to different message brokers. I've focused on RabbitMq so there is no if. The ConfigureOneWay is almost identical but does not require a queue, as it is intended for publishing messages. We will create two separate connections - one for handling incoming messages, second for publishing. This is a good practice that positively influences performance [5]. Connection name is not required, but I decided to use it as well, rabbit management plugin shows the connection name if it is specified, so you can easily tell which is which.
* `registerHandler` function is the next wrapper that will help us to register handlers. We won't be using any DI Container, so let's use `BuiltinHandlerActivator` which is a nice Rebus thing that fits well into the world of partial application and function-based handlers (not classes that implements `IHandler` interface). This beats MassTransit regarding F# world - As far as I know, it doesn't offer anything like that out-of-the-box.
* `markerNeighbourTypes` and `turnSubscriptionsOn` functions allow us easily to subscribe asynchronously to messages of the desired type. The first function can be changed to any other function that returns an array of types, you can also remove it completely and subscribe to explicit types if you wish. I decided to use reflection and establish a mini-convention, so I can forget about adding the next subscriptions as long as they are kept in the same module. Good stuff for small thins. You will see that I use these functions together - I simply pass `markerNeighbourTypes` to `turnSubscriptionsOn`.

## 3. Nice stuff you showed here, but will it work? 
Of course it will! It was working as soon as I ended writing the code. The test was green ;) Here it is:
```fsharp
[<Fact>]
let ``GIVEN pending outbox messages WHEN execute THEN messages are published to the broker and can be consumed from the broker`` () =
    // Arrange
    let expectedNotification1 = { Id = (generateId()); SomeText = "Whatever1"; Amount = 11.11M }
    let expectedNotification2 = { Id = (generateId()); SomeText = "Whatever2"; Amount = 22.22M }
    let (tcs1, tcs2) = (TaskCompletionSource<WhateverHappened>(), TaskCompletionSource<WhateverHappened>())
    let handler (message: WhateverHappened) = async {
      message.Id |> function
        | _ when expectedNotification1.Id = message.Id -> tcs1.SetResult message
        | _ when expectedNotification2.Id = message.Id -> tcs2.SetResult message
        | _ -> failwith $"This shouldn't happened, %s{nameof WhateverHappened} with unexpected Id: %d{message.Id} was received."
    }
    use activator = new BuiltinHandlerActivator() |> Messaging.registerHandler handler
    use bus = Messaging.configure "amqp://localhost" "two-way-connection-tests" activator
    bus |> Messaging.turnSubscriptionsOn Messaging.markerNeighbourTypes<Marker> |> Async.RunSynchronously
    Outbox.commit generateId (save DbConnection.create) [expectedNotification1; expectedNotification2] |> Async.RunSynchronously
    // Act
    Outbox.execute (read DbConnection.create)
                   (moveToProcessed DbConnection.create)
                   (Messaging.publish bus)
                   |> Async.RunSynchronously
    // Assert
    let actualNotification1 = tcs1.Task |> Async.AwaitTask |> Async.RunSynchronously
    let actualNotification2 = tcs2.Task |> Async.AwaitTask |> Async.RunSynchronously
    actualNotification1 |> should equal expectedNotification1
    actualNotification2 |> should equal expectedNotification2
```
Lead me to guide you through the test (but I hope that you already know everything! I put quite an effort to make all of my tests easy to understand). 
1. First I create 2 domain notifications of a `WhateverHappened` type.
2. Then I prepare two `TaskCompletionSource`, which will allow me to elegantly wait for the messages delivered from the bus (no `Thread.Sleep` or `Task.Delay` crap).
3. `handler` is my subscription handler that will resolve the `TaskCompletionSource` once it will get the message from the bus.
4. Then I create Rebus `BuiltinHandlerActivator` which will call my handler, and start the bus. 
5. Time to commit the domain notifications to the outbox - on line 29. Normally you would partially apply the generateId and save functions and just pass the domain events to the function call in the application layer (aka imperative host). 
6. Now we trigger the outbox action and pass the dependencies. Normally this would be done by another process (background job).
7. In the assert part we synchronously get the notifications from `TaskCompleationSource`.
8. And check if what we give (publish) is what we get (received from subscription).

Keep in mind that the test requires the Postgres database and RabbitMq to be up and running. In the repo there is a docker-compose file, so you can set this up in one-line command. When you run the test you should see some side-effects using rabbit management plugin like follows:
![](/img/outbox/rabbit.png)

Of course, the test should be green. 

## 4. Hosting the outbox - Polling publisher
So... let's do the boring stuff in Giraffe (because almost everything is running on the web nowadays) and job scheduler - Quartz.NET (In the past I've used Hangfire - but in C# - for this and it worked very well so you may try this instead). The job scheduler and `Outbox.execute` function combination is also a pattern and it is named "Polling publisher" [2][8]. This will be a simple app that;
1. Will expose an endpoint that you can call to commit a domain notification. 
2. Will subscribe to the `WhateverHappened` notification.
3. Will handle the `WhateverHappened` by printing to console.
4. Will publish the committed notifications using Quartz.Net Job and .net hosted services.
5. We will create two connections - one for publishing and one for subscribing so you will have an overview of how to create an "all-in-one" app, only consuming app or only publishing app.

All that with composition root, partial application, and F#. 

#### 4.1 Domain notification handler
This is the easiest part here. It looks just like this:
```fsharp
module Handlers =

  let printWhateverHappenedWithSmiley (notification: WhateverHappened) =
    async {
      printfn "%A" notification
      printfn ":)"
    }
```
Cool isn't it? No `IHandler<>` implementation :) I like that one.

#### 4.2 Giraffe HttpHandler with endpoint for Outbox.Commit
No drama here, if you ever wrote something in giraffe and read my [previous post about composition root and partial application](../2020-12-11-fsharp_composition_root/) you should be bored.
```fsharp
module HttpHandlers =
    let whateverHappened (commit: obj list -> Async<unit>)
                         generateId
                         : HttpHandler =
      fun (next: HttpFunc) (ctx: HttpContext) ->
        task {
          let whateverHappened: WhateverHappened = {
            Id = generateId()
            SomeText = "Hi there!"
            Amount = 100.20M
          }
          do! commit [whateverHappened]
          return! text $"Thank you. %A{whateverHappened} was scheduled" next ctx
        }

    let handlers (root: CompositionRoot.Dependencies) =
      choose [
        route "/whatever" >=> (whateverHappened root.OutboxCommit root.GenerateId)
        route "/"         >=> text "Hello :)" ]
```
 
The `commit: obj list -> Async<unit>` is something we already have (`Outbox.commit`), generateId is a simple function that returns int64 (you can see its implementation in the repo - simple stuff with IdGen library [7]). Normally you would call some workflow from the app layer, fetch some kind of aggregate from somewhere (database), apply some domain operations, and then save it with the commit function in the same `TransactionScope`. I decided to make my life easier here - so I publish directly from the endpoint.

#### 4.3 Glueing stuff together - CompositionRoot
Let's gather the dependencies now and compose the dependency tree:
```fsharp
namespace WebHost

open Outbox
open DapperFSharp
open Rebus.Activation
open Rebus.Bus
open RebusMessaging

module CompositionRoot =

  type Dependencies = {
    OutboxCommit: obj list -> Async<unit>
    OutboxExecute: Async<unit>
    MessageBus: IBus
    GenerateId: unit -> int64
  }
  
  let compose =
    let pubBus = Messaging.configureOneWay
                   "amqp://localhost"
                   "pubConnection"
                   (new BuiltinHandlerActivator())
    let subBus = Messaging.configure
                   "amqp://localhost"
                   "subConnection"
                   (new BuiltinHandlerActivator() |> Messaging.registerHandler Handlers.printWhateverHappenedWithSmiley)
    let dbConnection = "Host=localhost;User Id=postgres;Password=Secret!Passw0rd;Database=outbox;Port=5432"
    {
      OutboxCommit = Outbox.commit
                       IdGenerator.generateId
                       (PostgresPersistence.save (createSqlConnection dbConnection))
      OutboxExecute = Outbox.execute
                        (PostgresPersistence.read (createSqlConnection dbConnection))
                        (PostgresPersistence.moveToProcessed (createSqlConnection dbConnection))
                        (Messaging.publish pubBus)
      MessageBus = subBus
      GenerateId = IdGenerator.generateId
    }
```
We pass the `pubBus` to the `Outbox.execute` - so we have one connection for publishing. We don't need it elsewhere (you shouldn't even in a big commercial app). The `Outbox.commit` will be the single place, that will publish the messages. The `subBus` will be needed, so we can subscribe to messages at the app startup. Note that we add handlers as well to the `subBus`. The nice helper-function we wrote allows us to pipe next handlers elegantly if we need more.

Finally, we compose Outbox functions and the tiny-shiny GenerateId function. Keep in mind that it would be even better to [split the composition root to 2-levels (so we can test stuff without publishing events)](../2020-12-11-fsharp_composition_root/).

#### 4.4 Program and EntryPoint
We are close here to what Giraffe provides in its docs. The main differences are that we compose the composition root here, we subscribe to messages, and we add a hosted service - with quartz job and the polling publisher that uses the `Outbox.execute` function.

```fsharp
module App =
    let configureApp (compositionRoot: CompositionRoot.Dependencies)
                     (app : IApplicationBuilder) =
      app.UseGiraffe (HttpHandlers.handlers compositionRoot)

    let configureServices (compositionRoot: CompositionRoot.Dependencies)
                          (services: IServiceCollection)
                          =
      services
        .AddGiraffe()
        .AddHostedService(fun _ -> QuartzHosting.Service compositionRoot.OutboxExecute)
      |> ignore

    [<EntryPoint>]
    let main _ =
      let root = CompositionRoot.compose
      Messaging.turnSubscriptionsOn
        Messaging.markerNeighbourTypes<Marker>
        root.MessageBus |> Async.RunSynchronously
      Host.CreateDefaultBuilder()
        .ConfigureWebHostDefaults(fun webHostBuilder ->
          webHostBuilder
            .Configure(configureApp root)
            .ConfigureServices(configureServices root)
            |> ignore)
        .Build()
        .Run()
      0
```

#### 4.5 QuartzHosting Service
Let me show you now how I have implemented Hosted Service with Quartz scheduler. 

```fsharp
namespace WebHost

open System.Threading.Tasks
open Microsoft.Extensions.Hosting
open FSharp.Control.Tasks.V2.ContextInsensitive
open Quartz
open Quartz.Impl
open Quartz.Spi

module QuartzHosting =
    
    type JobFactory(outboxExecute: Async<unit>) = 
      interface IJobFactory with
        member _.NewJob(bundle, _) =
          match bundle.JobDetail.JobType with
          | _type when _type = typeof<PollingPublisher.Job> -> PollingPublisher.Job(outboxExecute) :> IJob
          | _ -> failwith "Not supported Job"
        member _.ReturnJob _ = ()
    
    type Service(outboxExecute: Async<unit>) =
      let mutable scheduler: IScheduler = null 
      interface IHostedService with
      
        member _.StartAsync(cancellation) =
          printfn $"Starting Quartz Hosting Service"
          task {
            let! schedulerConfig = StdSchedulerFactory().GetScheduler()
            schedulerConfig.JobFactory <- JobFactory(outboxExecute)
            let! _ = schedulerConfig.ScheduleJob(
                      PollingPublisher.job,
                      PollingPublisher.trigger,
                      cancellation)
            do! schedulerConfig.Start(cancellation)
            scheduler <- schedulerConfig
          } :> Task
        
        member _.StopAsync(cancellation) =
          printfn $"Stopping Quartz Hosting Service"
          scheduler.Shutdown(cancellation)
```
Let's go through this step by step
1. Quartz easily integrates with many DI Containers. We have none. You can use the built-in JobFactory, but it assumes that the Job has a default empty constructor. That is why I implemented the IJobFactory and rolled out my own. Consider moving JobFactory to its own file if you need more Quartz Jobs. The factory needs outboxExecute dependency, let's pass it through the constructor. We will get it from the composition root (see configureServices in the 4.4 section).
2. Service is an actual Hosted Service. We store scheduler reference which we Shutdown if the service stops. Since the StartAsync expects C# Tasks I decided to use task computation expression to avoid repetitive conversions between async models. 
3. In `StartAsync` we grab the Scheduler instance from the Factory and initialize it (its ThreadPool, JobStore, and DataSources).
4. Then we specify our JobFactory, and we schedule our actual job (I will show the implementation in the next section).
5. Finally we start the scheduler, assign the reference and convert the resulting Task<Unit> to Task to make the interface method and compiler happy.

At this point, you should already have an idea of how to add more Quartz Jobs to the Quartz Hosted Services if you need them. Let's see how a Quartz Job may look like in F#.

#### 4.6 Polling Publisher Quarzt Job

To create the job we need 3 things. 
1. A trigger - Quartz comes with a handful set of methods which by using method chaining can lead you to configure different triggers. It also can accept a Cron expression if you prefer.
2. A class that implements Quartz IJob interface and its Execute method. We only need to fire the `Outbox.execute` function here so we ended up with one line method body. `[<DisallowConcurrentExecution>]` is very important for us. Quartz will make sure that only one Job at a time will take place (even in case of some delays etc). Thanks to this we avoid table locks - so the polling publish won't end up on races. 
3. A job again :) This is actual instruction that we have to pass to the scheduler, as it expects IJobDetail (not IJob). I am not sure why we can't just pass IJob to the scheduler + give some details there. This could be improved in Quartz.Net.

The resulting code is short (Keep in mind that I have hardcoded some configuration, you may want to parametrize this using configuration files):

```fsharp
namespace WebHost

open System.Threading.Tasks
open Quartz

module PollingPublisher = 
    let trigger = TriggerBuilder
                    .Create()
                    .WithSimpleSchedule(fun scheduler ->
                        scheduler.WithIntervalInSeconds(5)
                                 .RepeatForever() |> ignore)
                    .Build()
                          
    [<DisallowConcurrentExecution>]
    type Job(outboxExecute: Async<unit>) =
      interface IJob with
        member _.Execute _ =
          outboxExecute |> Async.StartAsTask :> Task
          
    let job = JobBuilder
                .Create<Job>()
                .WithIdentity("PollingPublisher")
                .Build();
```
And That's it! We have all the pieces. That was a long way, let me remind you that there is a repository with the source code, tested outbox and CI set up [11].


## 5. Testing
I tried this implementation in different ways - I left it running for a couple of hours and hitting the endpoint from time to time, I filled the queue with pending messages and then I've connected with the app, I tried to publish several dozen messages at once - everything is working. When I stop the app the connections with channels are closing nicely. But! If you will find something please let me know - I will try to improve my solution or simply submit me a PR.

## 6. Summary
I hope we filled a gap in the F# world. 
* I wasn't able to find any implementation of transactional outbox pattern in F#. 
* I was not able to find any example of Quartz.Net in F# and Giraffe.
* I was not able to find easy examples with Rebus and F# (I found the only example of Rebus with Saga in the console app).

But maybe I am a bad googler? If so, I am happy that we've added more results to the search engine ;) What is nice is that we glued all that stuff here! Go and spread the news to the world that F# is a kickass language and you can do such things easily! 

What I am concerned about is that almost everything wants to integrate with DI Containers. This is nice for C# devs - especially in times of `Microsoft.Extensions.DependencyInjection` packages, but for us - functional lovers this is a pain in the ass. Especially in Quartz, I was forced to implement some kind of JobFactory... that wasn't hard but that was a strange experience... maybe I am just needlessly skeptical - all in all, I found the way to do it more "functionally" but still I had to play with classes and interfaces. What is funny - I think that implementing an interface in F# is more well-thought than in C#. You know - in C# you write "**:**" and you can't skip "**I**" in the interface name because then you don't know if you inherit or if you implement an interface when you read the code. This does not have a place in F#. 

I like Rebus. Maybe MassTransit has more stars on GitHub (there is also Brighter now) but this lib is just great. It is easier to start with, plays nice with F#. The only drawback is that I do not understand why the hell we need an activator for a publish-only bus??? I suspect that not all types of transport support that kind of communication, thereby mookid8000 decided to keep it that way. All in all, you can pass just a new instance there and carry on. Remember - Rebus is cool and You should consider it.

- - -
<b>References:</b><br/>

Websites: <br/>
[1] [microservices.io: outbox pattern - Chris Richardson](https://microservices.io/patterns/data/transactional-outbox.html) <br/>
[2] [microservices.io: polling publisher - Chris Richardson](https://microservices.io/patterns/data/polling-publisher.html) <br/>
[3] [Outbox pattern in C# - Kamil Grzybek](http://www.kamilgrzybek.com/design/the-outbox-pattern/)<br/>
[4] [Enterprise Integration Patterns: Idempotent Receiver - Gregor Hophe, Bobby Woolf](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html)<br/>
[5] [RabbitMq best practices](https://www.cloudamqp.com/blog/2017-12-29-part1-rabbitmq-best-practice.html)<br/>
[6] [Rebus library](https://github.com/rebus-org/Rebus)<br/>
[7] [IdGen library](https://github.com/RobThree/IdGen)<br/>

Books and Documents: <br/>
[8] [*Microservices Patterns* - Chris Richardson](https://www.goodreads.com/book/show/34372564-microservice-patterns) <br/>
[9] [*Enterprise Integration Patterns* - Gregor Hohpe, Bobby Woolf](https://www.goodreads.com/book/show/85012.Enterprise_Integration_Patterns)<br/>
[10] [*How To Handle Missing Information Without Using NULL* - Hugh Darwen](https://www.dcs.warwick.ac.uk/~hugh/TTM/Missing-info-without-nulls.pdf)<br/>

Source Code: <br/>
[11] [F# Outbox on GitHub](https://github.com/marcingolenia/fsharp-outbox)<br/>