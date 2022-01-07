---
templateKey: blog-post
title: >-
  .NET 6 Minimal apis for F# devs, what we get? (including testing)
date: 2021-12-30T17:35:00.000Z
description: >-
  So with .NET 6 we have received loudly announced minimal apis. Well... I would name them normal APIs (I am looking 👀 on express.js ...) but let's put the sarcasm aside and lets see how it could improve API development for F# developers.
featuredpost: true
featuredimage: /img/api.webp
tags:
  - 'F#'
---
## 1. Introduction

> This post is part of the F# Advent Calendar 2021. Special thanks to Sergey Tihon for organizing this! [Check out all the other great posts there!](https://sergeytihon.com/2021/10/18/f-advent-calendar-2021/).

If You are "show me the code" guy, You can just go and see the repo here: https://github.com/marcingolenia/minimal-apis-fsharp. But I invite You to read the full post.

So! I saw how easy it should be to create API using the new "Minimal API" model brought to live in .NET 6. Let's go and check. No powerful IDE is required, we won't use any templates. Just bash and VSCode, but a notepad or nano will do.

## 2. Let's build the simplest API

Let's create the folder structure and 2 files - fsproj and Program.fs that will run our API:

```bash
mkdir -p MinApi/MinApi && cd "$_"
touch MinApi.fsproj Program.fs
```
Did You know that You can create directory hierarchy by specyfying -p argument? Handy, use it. The "&_" thing is a special thing which holds argument from previous command. Handy, use it.

Let's pick up the proper SDK nad select the framework version in the project file:

```bash
<Project Sdk="Microsoft.NET.Sdk.Web">
    <PropertyGroup>
        <TargetFramework>net6.0</TargetFramework>
    </PropertyGroup>
    <ItemGroup>
        <Compile Include="Program.fs" />
    </ItemGroup>
</Project>
```
Easy. No templates or generated projects are needed right? Time to write some code with the help of MSDN documentation. This should work:

```fsharp
open Microsoft.AspNetCore.Builder
open System

let builder = WebApplication.CreateBuilder()
let app = builder.Build()

app.MapGet("/", Func<string>(fun () -> "Hello World!")) |> ignore
app.Run()
```

Now... that is concise isn't it? Let's try to run it:

```bash
dotnet run
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: https://localhost:5001
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Production
info: Microsoft.Hosting.Lifetime[0]
      Content root path: /home/marcin/projects/MinApi/
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 GET http://localhost:5000/ - -
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[0]
      Executing endpoint 'HTTP: GET / => Invoke'
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[1]
      Executed endpoint 'HTTP: GET / => Invoke'
info: Microsoft.AspNetCore.Hosting.Diagnostics[2]
      Request finished HTTP/1.1 GET http://localhost:5000/ - - - 200 - text/plain;+charset=utf-8 32.5680ms
```
Cool! You can see in the logs that it worked (I've hit the endpoint). 

What makes me anxious... is the Func up there. We cannot simply pass fsharp function as a parameter in the route mapping, we have to convert it to C# Func. It is easy to do, but do we have to? I really like Giraffe because of its simplicity and F# friendly programming model (Kleisli composition aka fish operator). Let me show You how to use it with minimal APIs and get rid off Func casting.

let's add Giraffe to the project file:
```bash
<Project Sdk="Microsoft.NET.Sdk.Web">
    <PropertyGroup>
        <TargetFramework>net6.0</TargetFramework>
    </PropertyGroup>
    <ItemGroup>
       <PackageReference Include="Giraffe" Version="5.0.0" />
    </ItemGroup>
    <ItemGroup>
        <Compile Include="Program.fs" />
    </ItemGroup>
</Project>
```
By mentioning that I love Giraffe because of the simplicity, I had mainly in mind the fact that Giraffe is just a middleware that runs on the request. So to plug it in it is enough to do this (works with current Giraffe version, You don't have to wait for Giraffe 6 - there is alpha 2 on nuget at the moment of writing):

```fsharp
open Microsoft.AspNetCore.Builder
open Giraffe

let webApp =
    choose [ route "/ping" >=> text "pong"
             route "/" >=> text "Hello World!" ]

let app = WebApplication.CreateBuilder().Build()
app.UseGiraffe webApp
app.MapGet("csharp/", Func<string>(fun () -> "Hello World!")) |> ignore
app.Run()
```
Since Giraffe is a middleware, It can coexist with the "native" netcore endpoints routes. It is handy when You want to introduce F# to C# solution, so You can host F# Giraffe API together with the one written in C# by pluggin in the middleware. I have an example of similar thing here: https://github.com/marcingolenia/painless_giraffe_with_csharp_netcore (.NET 5.0 but You will get the idea). For the new stuff we don't want this mix, remove that line!

```fsharp
open Microsoft.AspNetCore.Builder
open Giraffe

let webApp =
    choose [ route "/ping" >=> text "pong"
             route "/" >=> text "Hello World!" ]

let app = WebApplication.CreateBuilder().Build()
app.UseGiraffe webApp
app.Run()
```
Better? I like it more. It should still work. 

## 3. But how to test minimal APIs?

There is one trick You have to do, let me show You. First lets create tests fsproj 

```bash
cd..
dotnet new sln
mkdir MinApi.Tests
touch MinApi.Tests/MinApi.Tests.fsproj
touch MinApi.Tests/Tests.fs
```
Infrastructure components, such as the test web host and in-memory test server (TestServer), are provided by the Microsoft.AspNetCore.Mvc.Testing package. This is minimal xml stuff You have to put in the fsproj to make a test project including the package:
```bash
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <GenerateProgramFile>true</GenerateProgramFile>
  </PropertyGroup>
  <ItemGroup>
    <Compile Include="TestApi.fs" />
    <Compile Include="Tests.fs" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="16.11.0" />
    <PackageReference Include="xunit" Version="2.4.1" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="6.0.1" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.4.3" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\MinApi\MinApi.fsproj" />
  </ItemGroup>
</Project>

```
Time to add projects to sln using two simple commands:
```bash
dotnet sln add MinApi/MinApi.fsproj
dotnet sln add MinApi.Tests/MinApi.Tests.fsproj
```
In the past we could use IWebHostBuilder to pass functions that can configure our test host. For example, the Program.cs or App module could look like this:
```fsharp
module App =
  // open ...  skipped because of verbosity 
  
  let configureApp (app: IApplicationBuilder) =
    let env = app.ApplicationServices.GetService<IWebHostEnvironment>()
    app.UseGiraffeErrorHandler(errorHandler)
      .UseHttpsRedirection()
      .UseStaticFiles()
      .UseGiraffe(HttpHandler.router)        
  let configureServices (services: IServiceCollection) = services.AddGiraffe() |> ignore
```
then we can call configureApp/configureServices to setup TestServer. 

```fsharp
let selfHosted =
  WebHostBuilder()
    .UseTestServer()
    .Configure(Action<IApplicationBuilder>(App.configureApp))
    .ConfigureServices(App.configureServices)
```

or alternatively we could point to a module (or class in C#) and do it like this;

```fsharp
let webBuilder = WebHostBuilder()
webBuilder.UseStartup<Startup>()
lettestServer = new TestServer(webBuilder)
```
Now there is no module or configure methods. Same for C# - there is no class. So ... how can we set up the TestServer?

Turns out, that during the build, the Program class is generated for us, but it is not visible before build, so the compilation will crash. This means that this stuff won't work (see [1] for some instructions on how to do integration testing in C#):

```fsharp
module TestApi 

    open Microsoft.AspNetCore.Mvc.Testing

    let create () = (new WebApplicationFactory<Program>()).Server
```
When we run `dotnet test` We get the error message:
```bash
Lookup on object of indeterminate type based on information prior to this program point. A type annotation may be needed prior to this program point to constrain the type of the object. This may allow the lookup to be resolved.F# Compiler72
The type 'Program' is not defined.F# Compiler39
```
What now? Well, turns out that we can pretend that the Program class is there. See the last line:

```fsharp
open Microsoft.AspNetCore.Builder
open Giraffe

let webApp =
    choose [ route "/ping" >=> text "pong"
             route "/" >=> text "Hello world" ]

let app = WebApplication.CreateBuilder().Build()
app.UseGiraffe webApp
app.Run()

type Program() = class end
```
According to MSDN [1] we can do what I've just described or expose internals to test project by adding this to csproj:
```bash
<ItemGroup>
     <InternalsVisibleTo Include="MyTestProject" />
</ItemGroup>
```
However it didn't work for F#. If You can do it let me know in the comments! I would love to use it, instead of empty Program class in my code.

Ok, we have a small function that brings our TestServer up, lets use it in the test:
```fsharp
module Tests

open Xunit
open FSharp.Control.Tasks
open TestApi

[<Fact>]
let ``/ should return "Hello world"`` () =
    task {
        let api = runTestApi().CreateClient()
        let! response = api.GetAsync "/"
        let! responseContent = response.Content.ReadAsStringAsync()
        Assert.Equal("Hello world", responseContent)
    }
```
You can run the test using `dotnet test` command, or `dotnet watch test` for continous execution. The test should pass.

## 4. Where to go from here?
We have built "Hello world" here, but it should work with complex API as well. I already introduced such tests and minimal API in my former company. It gets the job done. You my find these extension methods handy:

```fsharp
type HttpClient with

    member this.Put (path: string) (payload: obj) =
        let json = JsonConvert.SerializeObject payload

        use content =
            new StringContent(json, Text.Encoding.UTF8, "application/json")

        this.PutAsync(path, content) |> Async.AwaitTask

    member this.Post (path: string) (payload: obj) =
        let json = JsonConvert.SerializeObject payload

        use content =
            new StringContent(json, Text.Encoding.UTF8, "application/json")

        this.PostAsync(path, content) |> Async.AwaitTask

    member this.Get<'a>(path: string) =
        this.GetAsync(path)
        |> Async.AwaitTask
        |> Async.bind
            (fun resp ->
                resp.Content.ReadAsStringAsync()
                |> Async.AwaitTask
                |> Async.map JsonConvert.DeserializeObject<'a>)

    member this.GetString(path: string) =
        this.GetStringAsync(path) |> Async.AwaitTask
```

so the test we wrote could look like this:
```fsharp
[<Fact>]
let ``/ should return "Hello world"`` () =
    task {
        let api = runTestApi().CreateClient()
        let! response = api.GetString "/"
        Assert.Equal("Hello world", response)
    }
```
You should also consider more F# friendly assertion library. I Love FsUnit, Expecto is also cool (awesome failed assertion messages). If You need to build complex API I advise You to move away from dependency injection and the whole "IServiceCollection" stuff in sake for composition. You may want to check my another post on this: https://mcode.it/blog/2020-12-11-fsharp_composition_root/. If You read it keep in mind one thing; I tend to do Inflexible composition root now and;
1. For dependencies that I own (ie DB, Rabbit broker etc) I run the dependencies using docker.
2. For dependencies that I don't own (ie other team service, salesforce, etc) I build simple mocks. Depending on the environment (dev or prod) I compose real stuff or mocked one. This has a nice benefit; I am able to use 100% of my service locally. 

## 5. Conclusions
We've built a simple API using simple tools - 0 generated projects using IDEs, 0 templates, 100% code which we control and understand. I hope You've also learned some bash tricks. Now! Let's compare this (I've removed the empty Program class in sake of fair comparison):

```fsharp
open Microsoft.AspNetCore.Builder
open Giraffe

let webApp =
    choose [ route "/" >=> text "Hello world" ]

let app = WebApplication.CreateBuilder().Build()
app.UseGiraffe webApp
app.Run()
```
to express.js equivalent: 
```js
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(5000, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
```
This is normal since many many years for node.js developers. I am happy that .NET ecosystem has gained a very lean and quick way to start building an API, like node.js devs have been doing. All in all I hope You share my opinion that the minimal apis, did improve F# web dev-ex as well. Remember, despite of the simple default host model in minimal API, You still have the power to adjust the host, service collection, error handling, logging etc. Benefit from simplicity now, configure later.

In addition I hope that the trick I mentioned (including sample repo) on how to integrate F# Giraffe stuff into existing C# WebApi will help You out there in bringing F# to Your company.
- - -
<b>References:</b><br/>
[1] MSDN Integration tests in ASP.NET Core - https://docs.microsoft.com/pl-pl/aspnet/core/test/integration-tests?view=aspnetcore-6.0