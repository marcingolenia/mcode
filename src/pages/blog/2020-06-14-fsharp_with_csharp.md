---
templateKey: blog-post
title: 'Make F# play nice with C# - how we to compose dependencies while hosting with C#'
date: 2020-06-14T21:44:10.000Z
description: >-
   F# is a nice functional alternative in .NET. I have convinced my teammates to use F# in our project at my work in a small new accounting bounded context that would be hosted by .NET Core C# host and Autofac based composition root. We already have a small F# based azure-function which has been a warm-welcomed area to extend/introduce changes so why not take F# to the next level? If you are looking for some hints how to deal with F# and C# in one solution this is a must-read.
featuredpost: true
featuredimage: /img/cf.png
tags:
  - 'F#'
  - 'C#'
---
## 1. Introduction
Code samples with EventDispatcher and CompositionRoot will use Autofac but the presented techniques should be easily applicable to Microsoft IoC Container and MediatR. Samples holds some mysterius ``_fSqlConnectionFactory`` but let me write about easy Dapper Wrapper in F# and Option/Nullable interop in next post.
#### 1.1 Motivation
If F# is .Net and if C# is .Net then what possibly could go wrong? People are saying that having C# and F# is easy... but it cuts both ways. If you don't mind having:
* Classes in F#
* Interface implementations in F#
* C# Tasks in F#
* FSharpAsync in C#
* FSharpFunc in C#
* FSharpTuple in C#
then yes, this is easy. But I didn't want to start doing this...this... heresy? The first version of my F# and C# integration like this: the domain layer looked like in F#-only solution, but the application layer was not so cool... After staring at this code for a few hours:
```fsharp
    type AccountingEventHandler(io: PrepareReportLineFlow.IO) = // class in F# :( DI using ctor -1
        interface Events.EventHandler<GlobalEvents.BillingItemsArchived> with // interface implementation ;/
            member this.Handle(event) = // interface implementation 
                let invoiceId = event.InvoiceId |> InvoiceId
                PrepareReportLineFlow.prepareReportLine io invoiceId |> Async.RunSynchronously
```
the decision has been made - put additional effort to allow F# code to be more functional-first.

#### 1.2 Background
To give you some background the solution hosts an API with 4 bounded contexts. There is an event which is being emitted whenever billing items are archived (so invoice was issued). For event handling, we use IoC Container. It simply looks for classes implementing `EventHandler<T>` interface and executes their `Handle(TEvent)` method. Composition root and bounded context are hosted by .Net Core API. More or less like this:

![](/img/sol.jpg)

I hope you get the idea. Don't bother with domain meaning here - I will focus on technical details related to F# and C# integration.

## 2. Dealing with dependencies in F# (skip it if you know the partial application, IO Sandwich)
So let me write a few words about dealing with dependencies in F#. Partial application is a simple yet effective technique to compose dependencies in a functional style. It's nothing more than passing functions as parameters to other functions (so called higher order functions) to return new function. It's easy with currying. Imagine that you want to 
1. read specific product from the database
2. apply coupon code to product
3. save the discounted product for after-marketing.
4. return the discounted product
5. Note that coupon codes cannot stack

In OO probably you would use repositories, dependency injection, interfaces to make this work (or write an ugly transaction-script). In F# we do IO Sandwich (but you can write ugly transaction-script here as well). Having in mind that in the application layer we want to design use-cases using domain, ports & adapters. This approach allows us to prevent async-injection (read more on ploeh blog [1]). The application layer could look like this;

```fsharp
module ApplyCouponCodeFlow
    type IO = {
       ReadProductBy: ProductId -> Async<Product>
       ReadCouponBy: CouponCode -> Async<Coupon>
       SaveDiscountedProduct: DiscountedProduct -> Async<Unit>
    }

    let applyCouponCode io (productId, couponCode) =
        async {
            let! product = io.ReadProductBy productId // IO
            let! coupon = io.ReadCouponBy couponCode // IO
            let discountedProduct = product |> Salesman.Apply discount // Domain Operation - pure function, no side-effects including async.
            do! io.SaveDiscountedProduct // IO
            return product
        }
```
If you checked Ploeh blog [2] that I mentioned you saw that Mark moves this even more to the "edges" to .Net API Controllers. I like to have it in the application layer. I think that API is just a driving port and shouldn't be responsible for the application control flow despite the name "Controller" because these particular controllers are coupled with selected hosting technology: .Net core, web API with OWIN, etc and controls the flow of http requests [3]. What is cool and worth to emphasizing is that the code is super-testable. You will mention my words once you will give it a try.
Having such a module with the Use-Case we can compose the functions;
```fsharp
// In your composition root:
let ComposeApplyCouponFlow =
    let io = {
        ReadProductBy = // DatabaseAdapter.ReadProductBy
        ReadCouponBy = // DatabaseAdapter.ReadCouponCode
        SaveDiscountedProduct = // DatabaseAdapterSpecificForPostmarketing.SaveDiscountedProduct
    }
    ApplyCouponCodeFlow.applyCouponCode io
```
I would consider skipping creating IO type for use cases with one or two side functions, however I really like the idea of code being explicit about side-effect functions. Finally here is a quick, easy example of usage in Giraffe:
```fsharp
let webApp =
    choose [
        routef "/Product/%i/Discount/%s" (fun(id, couponCode) -> json (Root.ComposeApplyCouponFlow() (id |> ProductId, couponCode |> CouponCode))
        RequestErrors.NOT_FOUND "Not Found"
    ]
```
IO sandwich automatically leads to ports and adapters. Scott Wlashin talks [4] about this style at NDC Conference but in terms of onion and clean architecture with IO at the edges, where workflows are composed outside the domain.

## 3. Let's compose an use case in C# Composition Root
Let the fun begin. Let me bring my real-project flow;
```fsharp
module CloseReportingPeriodFlow = // this closes a report and opens new one.
    open Accounting

    type IO = {
        ReadSalesReport: unit -> Async<SalesInvoicesReport>
        GenerateSalesReportId: unit -> Async<SalesInvoicesReportId>
        SaveClosedReport: ClosedSalesInvoicesReport -> Async<unit>
        StoreNewReport: SalesInvoicesReport -> Async<unit>
    }

    let closeReportingPeriod io =
        async {
            use transaction = ReadCommitedTransaction.Create()
            let! openedReport = io.ReadSalesReport()
            let! newReportId = io.GenerateSalesReportId()
            let (closedReport, newReport) = Accountant.closeReportingPeriod openedReport DateTime.UtcNow newReportId
            do! io.SaveClosedReport closedReport;
            do! io.StoreNewReport newReport
            transaction.Complete()
        }
```
How can we approach this? We can write a class that wraps the closeReportingPeriod function - as you should know F# modules are static classes. But do we have to? Creating dumb wrappers seems like an architectural disaster. F# can call C# Func<> easily so why not to call F# function from C#? Let's register the Func<> and inject it to the C# controller in which the Func will be executed. Sounds like a good compromise doesn't it? C# Types in C#, F# in F#. Let's give it a try! 

##### Step 1 - compose IO
In our C# CompositionRoot let's create CloseReportingPeriodFlow IO type by writing ``var io = new CloseReportingPeriodFlow.IO()``

![](/img/fc1.png)

Well... FSharpFunc? FSharpAsync? Unit? In C#? No worries! Let's write
```fsharp
FSharpFunc<ClosedSalesInvoicesReport, FSharpAsync<Unit>> saveClosedReport = report =>
    SalesReportDao.saveClosedReport(_fSqlConnectionFactory, report);
```
Unfortunately `` ... report => ...`` is C# Func, not FSharpFunc, so you will end up with this error:

``Cannot convert initializer type 'lambda expression' to target type 'Microsoft.FSharp.Core.FSharpFunc<SalesInvoicesReport.ClosedSalesInvoicesReport,Microsoft.FSharp.Control.FSharpAsync<Microsoft.FSharp.Core.Unit>>'``
Ok... Let's do it using Func. Let's give it a try:
```fsharp
Func<SalesInvoicesReport, FSharpAsync<Unit>> storeNewReport = report =>
    SalesReportDao.insertNewReport(_fSqlConnectionFactory, report);
```
Yay! No errors. Let's pass it to the CloseReportingPeriodFlow.IO ctor... The result:

``Argument type 'System.Func<SalesInvoicesReport.ClosedSalesInvoicesReport,Microsoft.FSharp.Control.FSharpAsync<Microsoft.FSharp.Core.Unit>>' is not assignable to parameter type 'Microsoft.FSharp.Core.FSharpFunc<SalesInvoicesReport.ClosedSalesInvoicesReport,Microsoft.FSharp.Control.FSharpAsync<Microsoft.FSharp.Core.Unit>>'`` 
So now we can't pass C# Func as F# Func. To fix this let's write some interop extension methods which can convert Funcs for us. F# already naturally creates the proper nesting structure for Func so instead of doing this again in C# let's write them in F#.
```fsharp
namespace FSharpCSharpInteroperability

open System
open System.Runtime.CompilerServices
open System.Threading.Tasks

[<Extension>]
type public FSharpFuncUtil =
    [<Extension>]
    static member ToFSharpFunc<'a,'b> (func:System.Func<'a,'b>) = fun x -> func.Invoke(x)
```
Basically we wrote a method that takes a C# Func (with one generic parameter 'a and result of generic type 'b) and returns FSharpFunc (``fun x``) that causes the C# Func to invoke with parameter x (of 'a type). Let's check if we did well:
```csharp
var io = new CloseReportingPeriodFlow.IO(
    readSalesReport.ToFSharpFunc()
);
```
``Constructor 'IO' has 4 parameter(s) but is invoked with 1 argument(s)``
Great! Let's add the next parameters.
```csharp
Func<FSharpAsync<SalesInvoicesReportId>> generateSalesReportId = () =>
    SalesReportDao.generateSalesReportId(_fSqlConnectionFactory);
```
No, we don't have an extension method for converting C# Func that takes nothing and returns something (so action delegate). It should be easier to write than the previous one (without the 'a right?) 
```fsharp
[<Extension>]
static member ToFSharpFunc (func:System.Func<'a>) = fun() -> func.Invoke();
```
Right 🤓 For the last two arguments we have everything we need. Complete IO definition;
```csharp
private Func<Task> ComposeCloseReportingPeriod()
{
    Func<FSharpAsync<SalesInvoicesReport>> readSalesReport = () =>
        SalesReportDao.readOpenedReport(_fSqlConnectionFactory);
    Func<ClosedSalesInvoicesReport, FSharpAsync<Unit>> saveClosedReport = report =>
        SalesReportDao.saveClosedReport(_fSqlConnectionFactory, report);
    Func<SalesInvoicesReport, FSharpAsync<Unit>> storeNewReport = report =>
        SalesReportDao.insertNewReport(_fSqlConnectionFactory, report);
    Func<FSharpAsync<SalesInvoicesReportId>> generateSalesReportId = () =>
        SalesReportDao.generateSalesReportId(_fSqlConnectionFactory);
    var io = new CloseReportingPeriodFlow.IO(
        readSalesReport.ToFSharpFunc(),
        generateSalesReportId.ToFSharpFunc(),
        saveClosedReport.ToFSharpFunc(),
        storeNewReport.ToFSharpFunc()
    );
    return // TODO compose workflow
}
```
##### Step 2 - compose workflow
Let's try to do partial application now by returning a Func which has the io dependency applied (complete workflow).
```csharp
return () => CloseReportingPeriodFlow.closeReportingPeriod(io);
```
``Cannot convert expression type 'Microsoft.FSharp.Control.FSharpAsync<Microsoft.FSharp.Core.Unit>' to return type 'System.Threading.Tasks.Task'``
As you (should) know in C# programming model, asynchronous methods return objects of type ``Task<T>``. F# has it own type ``Async<T>``. We see it as ``FSharpAsync`` (error message). They are not compatible becuase they use different asynchrnous model:
* C# uses **Hot Tasks**. In this model asynchronous code returns a Task that already has been cancelled and will eventually produce a value.
* F# uses **Tasks generators**. In this model asynchronous code returns an object that will generate and start a task when it is provided with a continuation to be called when the operation completes.

Each has it pros and cons. If you are interested in more details I strongly recommend a series of 4 blog posts from Tomas Petricek who was responsible for selecting asynchronous model for F# [4] together with Don Syme.
Back to the problem - we have two options now. We can change the composed type as follows:
```csharp
private Func<Task> ComposeCloseReportingPeriod()
// to:
private Func<FSharpAsync<Unit>> ComposeCloseReportingPeriod()
```
But then we will force C# Controllers to use F# types. Let's decide to not be that aggresive - We can encapsulate whole F#<->C# interopability issues handling in CompositionRoot supported with some helper extensions methods or whatever. Luckily it turned out that we can easily convert FSharpAsync to C# Task; 
```csharp
public static class FSharpAsyncExtension
{
    public static Task<T> StartAsDefaultTask<T>(this FSharpAsync<T> computation) =>
        FSharpAsync.StartAsTask(
            computation,
            new FSharpOption<TaskCreationOptions>(TaskCreationOptions.None),
            new FSharpOption<CancellationToken>(CancellationToken.None));
}
```
Now we can complete the composition:
```csharp
        private Func<Task> ComposeCloseReportingPeriod()
        {
            Func<FSharpAsync<SalesInvoicesReport>> readSalesReport = () =>
                SalesReportDao.readOpenedReport(_fSqlConnectionFactory);
            Func<ClosedSalesInvoicesReport, FSharpAsync<Unit>> saveClosedReport = report =>
                SalesReportDao.saveClosedReport(_fSqlConnectionFactory, report);
            Func<SalesInvoicesReport, FSharpAsync<Unit>> storeNewReport = report =>
                SalesReportDao.insertNewReport(_fSqlConnectionFactory, report);
            Func<FSharpAsync<SalesInvoicesReportId>> generateSalesReportId = () =>
                SalesReportDao.generateSalesReportId(_fSqlConnectionFactory);
            var io = new CloseReportingPeriodFlow.IO(
                readSalesReport.ToFSharpFunc(),
                generateSalesReportId.ToFSharpFunc(),
                saveClosedReport.ToFSharpFunc(),
                storeNewReport.ToFSharpFunc()
            );
            return () => CloseReportingPeriodFlow.closeReportingPeriod(io).StartAsDefaultTask();
        }
```
This is extremely easy to register, I have used named paramater because registering ``Func<Task>`` type seems to ask for errors. This causes some more code but nothing extraordinary:
```csharp
var closeReportingPeriodParam = new ResolvedParameter(
    (paramInfo, ctx) => paramInfo.ParameterType == typeof(Func<Task>),
    (paramInfo, ctx) => closeReportingPeriod);
builder.RegisterInstance(closeReportingPeriod)
    .Named<Func<Task>>(IoCConsts.CloseReportingPeriodFunc);
builder.RegisterType<SaleInvoicesReportsController>()
    .WithParameter(closeReportingPeriodParam);
```
And the controller looks like this:
```csharp
    [Route(template: "api/[controller]")]
    public class SaleInvoicesReportsController : ControllerBase
    {
        private readonly Func<Task> _closeReportingPeriod;

        public SaleInvoicesReportsController(Func<Task> closeReportingPeriod) =>
            _closeReportingPeriod = closeReportingPeriod;

        [HttpPatch]
        public Task CloseReport() => _closeReportingPeriod();
    }
```
Cool isn't it? We didn't cover the situation in which the flow requires some paramters. 
##### Step 3 - compose workflow that actually requires some parameters.
In that case you should register a Func that takes that parameters. Here's an example:
```csharp
private Func<InvoiceId /*The parameter*/, Task<FileType.File>> ComposeSingleReportFileGenerator()
{
    Func<FSharpList<CountryIsoCode>> readEuCountries = EuCountries.listEuCountries;
    Func<InvoiceId, FSharpAsync<InvoicedServices>> readInvoicedServices = invoiceId =>
        ArchivedBillingItemsToSalesInvoiceReportDao.readInvoicedServices(_fSqlConnectionFactory, invoiceId);
    Func<Tuple<FSharpList<SalesInvoicesReportLine>, FileType.FileName>, FileType.File>
        convertToCsv = report => CsvConverter.convertToCsv(report.Item1, report.Item2);
    var io = new PrepareReportFromSingleInvoiceFlow.IO(
        AccountingInvoiceDao.GetBy(_cSqlConnectionFactory).ToFSharpFunc(),
        readEuCountries.ToFSharpFunc(),
        readInvoicedServices.ToFSharpFunc(),
        convertToCsv.ToFSharpFunc());
    Func<InvoiceId, Task<FileType.File>> singleReportFileGenerator = invoiceId =>
        PrepareReportFromSingleInvoiceFlow.prepareReportFromSingleInvoice(io, invoiceId).StartAsDefaultTask();
    return singleReportFileGenerator;
}
Then register a func ``Func<InvoiceId, Task<FileType.File>>`` in Autofac or whatever you use. I think you get the idea.
```

## 4. Let's handle events with F# handlers from C# based event dispatcher
First let me show you the EventDispatcher:
```csharp
    public class AutofacEventDispatcher : EventDispatcher
    {
        private readonly IComponentContext _context;
        public AutofacEventDispatcher(IComponentContext context) => _context = context;

        public async Task Dispatch<T>(params T[] events) where T : Event
        {
            if (events == null) return;
            foreach (var @event in events)
            {
                var handlerType = typeof(IEnumerable<>)
                    .MakeGenericType(typeof(Events.EventHandler<>)
                        .MakeGenericType(@event.GetType()));
                var eventHandlers = (IEnumerable<dynamic>)_context.ResolveOptional(handlerType);
                var tasks = eventHandlers
                    .Select(handler => handler.Handle((dynamic)@event))
                    .Cast<Task>()
                    .Concat(funcHandlersTasks);
                await Task.WhenAll(tasks);
            }
        }
    }
```
It simply asks autofac to resolve handlers based on event type. A class must then implement this inteface: 
```csharp
public interface EventHandler<in T> where T : Event
{
    Task Handle(T @event);
}
```
We can do this in F# but its not the most idiomatic way. I wrote in introduction that implementing this interface was the main factor that drove me to handle everything in composition root. That's true but... but we need to modify EventDispatcher as well to make it work with Funcs.
```csharp
    public class AutofacEventDispatcher : EventDispatcher
    {
        private readonly IComponentContext _context;
        public AutofacEventDispatcher(IComponentContext context) => _context = context;

        public async Task Dispatch<T>(params T[] events) where T : Event
        {
            if (events == null) return;
            foreach (var @event in events)
            {
                var funcHandlersTasks = FindFuncHandlers(@event);
                var handlerType = typeof(IEnumerable<>)
                    .MakeGenericType(typeof(Events.EventHandler<>)
                        .MakeGenericType(@event.GetType()));
                var eventHandlers = (IEnumerable<dynamic>)_context.ResolveOptional(handlerType);
                var tasks = eventHandlers
                    .Select(handler => handler.Handle((dynamic)@event))
                    .Cast<Task>()
                    .Concat(funcHandlersTasks);
                await Task.WhenAll(tasks);
            }
        }

        private IEnumerable<Task> FindFuncHandlers<T>(T @event) where T : Event
        {
            var funcHandlerType = typeof(Func<,>)
                .MakeGenericType(@event.GetType(), typeof(Task));
            var funcHandlerCollectionType = typeof(IEnumerable<>)
                .MakeGenericType(funcHandlerType);
            var funcHandlers = (IEnumerable<dynamic>) _context.Resolve(funcHandlerCollectionType);
            var funcHandlersCasterd = funcHandlers
                .Select(handler => handler(@event))
                .Cast<Task>();
            return funcHandlersCasterd;
        }
    }
```
So I kept the promise! Nothing FSharpish here. Autofac now is looking for Funcs also. Note that if you have ``void Handle(Event @event)`` you will have to modify a little bit the code. Now we can write event handler in fsharp like this: 
```fsharp
module AccountingHandler =
    open SalesInvoicesReport

    let Handle (prepareReportLineFlow: InvoiceId -> Async<Unit>) (event: GlobalEvents.BillingItemsArchived) =
        let invoiceId = event.InvoiceId |> InvoiceId
        prepareReportLineFlow invoiceId
```
and register it using Autofac: 
```csharp
    private Func<BillingItemsArchived, Task> ComposeBillingItemsArchivedHandler() {
            ...
            var io = new PrepareReportLineFlow.IO(...)
            Func<BillingItemsArchived, Task> handler = @event =>
                AccountingHandler.Handle(prepareReportLine.ToFSharpFunc(), @event).StartAsDefaultTask();
            return handler;
        }
```
registration:
```csharp
builder.RegisterInstance(ComposeBillingItemsArchivedHandler());
```
That's it! EventDispatcher will hande activation and calling the Handle function for us! To be hones I am thinking about moving C# EventHandlers to Funcs as well and drop the EventHandler interface.

## 5. Summary
I am really happy with what was achieved here. Composition root is still the single place to compose dependencies it only has to do some adjustment on the types to make it "click". Such way of F# and C# coexistence is really attractive (at least to me) and builds an approachable point in "Let's introduce F# in our project" discussion. You could always make a separate service to host F# but I found it to be a source of "fear" for other people as they will have to learn Giraffe or Saturn as well. By doing intermediate steps and creating a win & win argument creates a bright future for more F# in your project. To sum up what I've discussed let me classify 3 ways of C# and F# integration.;
1. By Heresy 😈 let's officially name it "by mixing OO with FP"
2. By Composition root types adjustments
3. By hosting as the other microservice

Thanks for reading! Here's a [public gist](https://gist.github.com/marcingolenia/c9e3a123d799e73e87911acc1c030da4) if you want to take a look on complete FSharpCSharpInteroperability. Stay tuned about integration of Dapper with F# and handling Nullable C# object!
- - -

## 6. Special Thank You
to [Marcin Sikroski](http://marcinlovescode.com/) who supported me on the task. Without him the integration wouldn't look so nice :)

<small>
<b>Footnotes:</b><br/>
[2] The discussion at the bottom of the blog post is very very interesting! Check it out as well. Mark and readers discuss putting to much responsibility to controller.<br/>
[3] I believe that Microsoft stole a useful name. Not so long time ago I was using name Controller in Application layer as well but everyone was surprised - calling Controller from Controller? I convinced my colleagues by asking what is wrong with that? We have something that controls the flow of the HTTP requests and something that controls the flow of our application. We have found consensus in renaming "our" controller to something else. I find that "UseCase" or "Flow" is also fine - I tend to use the second now because it is short.
<br/><b>References:</b><br/>
Websites:<br/>

[1] [Asynchrouns injection by Mark Seeman](https://blog.ploeh.dk/2019/02/11/asynchronous-injection/) <br/>
[2] [Scott Wlashin about Dependency Injection in F#](https://fsharpforfunandprofit.com/posts/dependency-injection-1/) <br/>
[3] [Stackoverflow question about DI in F# with Tomas Petricek and Scott Wlashin answer](https://stackoverflow.com/questions/52156730/f-analog-of-dependency-injection-for-a-real-project) <br/>
Videos:<br/>
[4] [Scott Wlashin - Reinventing the Transaction Script (I like to name it: making Transaction Script Sexy)](https://www.youtube.com/watch?v=USSkidmaS6w)