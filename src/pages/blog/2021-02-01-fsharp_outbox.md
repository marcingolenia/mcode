---
templateKey: blog-post
title: >-
  Outbox pattern in F#
date: 2021-02-01T19:35:00.000Z
description: >-
  If you are implementing more than one service and you need to establish asynchronous communication in-between, or if you need bullet-proof asynchronous communication with 3rd party services the outbox pattern might be a handy tool. Let's look at how can we implement one in the beloved F#!
featuredpost: true
featuredimage: /img/outbox.svg
tags:
  - 'F#'
  - Patterns
---
## 1. Introduction

Let's consider a simple use-case to give you a full understanding of when the outbox pattern can be useful. If you know this and that about it, feel free to skip the introduction.

I am not a fan of UML, but for learning, explanations it is just fine so let's try to use the sequence diagram to explain the problem to you step by step. Basic flow;
1. User places an order in the app.
2. The order is created and saved in the database.
3. An event is being published "order placed".
4. User is informed in the app "thank you for placing the order".
5. Event is being consumed, and invoice is prepared. 
6. Invoice is saved.
7. Happy end.

Let's say that invoicing is done by another service and another team. You agreed on published language "order placed" to exchange the data. Next, let's keep things simple and let's neglect the doubts you might have like "What about payments?" or "Why the invocie is not being send?". It is important for me to make you understand the outbox pattern, not to build a perfect business use-case. So you might plan to build something like this:

![](/img/outbox/outbox1.png)

And it should work in most cases, unless...

#### 1.1 The problem 
Unless the application will die just after saving the order in the database, or the message broker will not be reachable (network problems, any reason...):

![](/img/outbox/outbox2.png)

You might try to do the things in different order. What if we publish the message first, then we save changes in the database? As you can guess it is now possible to emit the message but the order won't be saved because the database can't be reached:

![](/img/outbox/outbox3.png)

Now we have to deal with invoice for not existing order. Of course we can make our best to reduce the risk by introducing retries, but even with 100 retries eventually you will meet the problem. 

#### 1.2 The solution
As you may guess (because of the title of the blog post) the solution here is to use the outbox pattern. You can also read a little bit about on microservices.io page [1]. If you do, please pay attention to term **high level domain events**. What the hell is that? More important domain events? No - this are events that has to be distinguished from domain events as they directly cause side effects. I really encourage you to name it differently. Kamil Grzybek in his article about outbox pattern in C# [2] comes up with "domain notification". I like it, let's stick to this name. 

The idea behind the outbox is to create outbox storage in the same database you mutate the state and use transaction to achieve atomocity. In other words; save the new order and save the "order placed" domain notification, if one of these operation fails, don't commit the transaction, so changes (if any) are rolled back. This mechanism is reflected in the pattern name: "Transactional Outbox". Then another process picks up the pending notification and distributes it in the desired way. I have made one sequence diagram more that shows this:

![](/img/outbox/outbox4.png)

Keep in mind one important thing - outbox pattern helps to achieve "at least once delivery". In corner cases you may end up with message duplicates (when notification message is published and outbox storage goes down before "marking" the notification as processed). If you need exactly once delivery you might google a litt bit for the inbox pattern (or wait for my post in the future 😉). But make sure you can't go with Idemponent receiver [3] - this guy will make your life simpler.

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
to the project with your domain notifications. Keep in mind that it can be anything - record, class, struct, whatever. Some developers likes to force a convention ie you must inhereit from `Notification` class. I don't like that - I see no benefit from it, but it's just my opinion. You may also ask why I decided to process the messages sequentially. Well... if we cannot publish the messages for any reason for some time, the pending outbox messages will keep growing. Firing thousands of messages in Parallel can be a bad idea. If you are sure you will handle the massive load, change it to Parallel - no problem. In github [4] I have introduced a `ParallelizationThreshold` parameter so you can tune the behavior elegantly. 

Full source code can be found on github [4]. That's it - the transactional outbox pattern is ready. 2 types (including empty interface) and 2 functions - as simple as that. The rest are just dependencies. 

#### 2.1 Persistence dependencies
I have decided to use postgres. As you can see I have decoupled the persistence from the outbox, so feel free to replace it with anything you want. 
First let's create schema for our outbox. It may look like this:
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
You can store processed and not processed messages in one table and nullable column `processed_on` which will store processed date if already processed. I will stick to a very inspirational document [5] in which Hugh Darwen (who was working on the relation model since the beginning) puts forward alternative approaches by introducing specialized relations. Let's do that. One nice benefit of this approach is that we gain some segration of concers - one table for holding things to process and one table that is actually an archive. We can apply tailor-made indexes, partitioning, etc.

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

Note that the functions signatures matches the outbox `save`, `read`, `setProcessed` functions signatures.

#### 2.2 Publisher dependency

For publishing messages I've decided to pull in a library that makes the underlying message broker just a matter of configuration, despite I decided to use RabbitMQ. I've picked up Rebus just because I wanted to put my fingers on something new for me. In the past I've also used MassTransit which is also great. To be honest I like Rebus more now, the configuration is easier and it seams that (by a chance or not) fits better with F# compared to MassTransit (in the team we were not able to write consumers without implementing the `IConsumer<>` interface). Let me present some helping-functions to deal with with message publishing and subscription:

```fsharp
namespace RebusMessaging

open System.Threading.Tasks
open Rebus.Activation
open Rebus.Bus
open Rebus.Logging
open Rebus.Config
open Notifications

module Messaging =
    let queueName = "mcode.fun"
    
    let private toTask asyncA =
      asyncA |> Async.StartAsTask :> Task
      
    let subscribe<'a> (bus: IBus) =
      bus.Subscribe<'a>() |> Async.AwaitTask
    
    let publish (bus: IBus) message =
      bus.Publish message |> Async.AwaitTask
    
    let start (handler: WhateverHappened -> Async<Unit>)
              (activator: BuiltinHandlerActivator)
              (endpoint: string)
              =
      activator.Handle<WhateverHappened>(fun message -> handler message |> toTask) |> ignore
      let bus = Configure.With(activator)
                         .Transport(fun transport -> transport.UseRabbitMq(endpoint, queueName) |> ignore)
                         .Logging(fun logConfig -> logConfig.Console(LogLevel.Info))
                         .Start()
      async {
        do! subscribe<WhateverHappened> bus
        return bus
      }
```
Let's talk about the code now.
* `toTask` function simply takes asynchronous function, turns it to the hot-async task model, and converts it to task type. It is handy for registering event handlers (line 26).
* `subscribe` and `publish` are simple wrappers to make the rebus methods calls more sexy in F# code. 
* `start` starts the bus and returns it, so we can manage its lifecycle (we have to). For instance in some appcore app we should dispose that guy using `IHostApplicationLifetime` and `ApplicationStopping` if we want to react to subscriptions during out app lifetime. I will show that later. 

Not that in the `start` function I have explicitly defined one handler (`<WhateverHappened>`). I encourage you to establish a convention in your project and do assembly scanning, find all types that matches the convention and register the functions to handle the subscriptions. You may need `Type.MakeGenericType(Type[])` to achieve that (or wait for me to write an supplementary post 🙃). All in all having these handlers added explicitly is also nice! (But make sure you don't forget to register one).

## 3. Nice stuff you showed here, but will it work? 
Of course it will! It was working as soon as I ended writing the code. The test was green ;) Here it is:
```fsharp
module when_outbox_processes_then_messages_are_published

open System.Threading.Tasks
open Rebus.Activation
open RebusMessaging
open Xunit
open FsUnit.Xunit
open Notifications
open Toolbox
open Outbox.PostgresPersistence
open Outbox

[<Fact>]
let ``GIVEN pending outbox messages WHEN execute THEN messages are published to the broker AND can be consumed from the broker`` () =
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
    use activator = new BuiltinHandlerActivator()
    use bus = Messaging.start handler
                              activator
                              "amqp://localhost" |> Async.RunSynchronously
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
Lead me guide you through the test (but I hope that you aleady know eveyrything! I put quite an effort to make all of my tests easy to understand). 
1. First I create 2 domain notification of `WhateverHappened` type.
2. Then I prepare two `TaskCompletionSource`, which will allow me to elegantly wait for the messages delivery from the bus.
3. `handler` is my subscription handler that will resolve the `TaskCompletionSource` once it will get the message from the bus.
4. Then I create Rebus `BuiltinHandlerActivator` which will call my handler, and start the bus. 
5. Time to commit the domain notifications to the outbox - on line 29. Normally you would partially apply the generateId and save functions and just pass the domain events to the function call in the application layer (aka imperative host). 
6. Now we trigger the outbox action and pass the dependencies. Normally this would be done by another process (background job).
7. In the assert part we synchronously get the notifications from `TaskCompleationSource`.
8. And check if what we give (publish) is what we get (received).

Keep in mind that the test requires postgres database and rabbitmq to be up and running. In the repo there is docker-compose file, so you can set this up in one-line command. When you run the test you should see some side-effects using rabbit managment plugin like follows:
![](/img/outbox/rabbit.png)

and the test should be green of course.

## 4. Hostirng the outbox
I didn't want to write this section, by after talking to a friend of mine we discovered that the reader would expect to see such section. So... let's do the boring stuff in Giraffe (because almost everything is running in the web nowadays) and job scheduler - Quartz.NET (In the past I've used Hangfire for this and it worked very well so you may try this instead).


## 5. Summary

- - -
<b>References:</b><br/>
Websites: <br/>

[1] [microservices.io outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html) <br/>
[2] [Kamil Grzybek post about outbox pattern in C#](http://www.kamilgrzybek.com/design/the-outbox-pattern/)<br/>
[3] [Enterprise Integration Patterns Gregor Hohpe and Bobby Woolf]()<br/>
[4] [F# Outbox on GitHub](https://github.com/marcingolenia/fsharp-outbox)<br/>
[5] [Hugh Darwen - How To Handle Missing Information Without Using NULL](https://www.dcs.warwick.ac.uk/~hugh/TTM/Missing-info-without-nulls.pdf)<br/>
[6] [Rebus](https://github.com/rebus-org/Rebus)<br/>
[7] [IdGen library](https://github.com/RobThree/IdGen)<br/>