---
templateKey: blog-post
title: >-
  Let's play with playwright using F# scripts.
date: 2021-07-16T17:35:00.000Z
description: >-
  In June Microsoft announced that .NET SDK is stable. For a long time, Selenium was (as far as I know) the only feature-rich web testing framework in .NET (except paid ones like Ranorex or Telerik Test Studio). I never liked the waits I had to do, which often caused the tests to be fragile. Playwright's puppeteer-like SDKs promise automatic wait and support for Python/.Net/Node.js/Java. Let's try this stuff in F#!
featuredpost: true
featuredimage: /img/playwright/playwright.webp
tags:
  - 'F#'
---
## 1. Introduction
Let's make few important points about [Playwright](https://playwright.dev/) before we start; 
1. Supports Chrome/Webkit/Firefox/Edge (with chromium of course 😁).
2. Has sdks for .Net/Node.js/Python/Java plus Go can be found on the internet, but is not official (at least yet).
3. Its philosophy is similar to Puppeteer (former Puppeteer devs are developing Playwright).
4. Works internally by using [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/), for WebKit and Firefox by extending their debugging protocol capabilities (browser behavior remains not touched!) to provide unified API. (Reminds me of Facade pattern).

The .Net SDK is of course C#-first so just follow official instructions to get started in C# (easy-peasy). Let's try to use it from F#, and then let's see what we can do about the "C#-first" thing. I already dream about automating stuff with F# and playwright 🙃.

## 2. Hello, world from Playwright!
Let's create a script file for instance `playwright.fsx`. So I guess we need to reference the nuget package first ;) Let's then stick to the docs (C# docs) and open a page in headless firefox, then we will go to duckduck.go and take a screenshot of the site. 
```fsharp
#r "nuget: Microsoft.Playwright"

open Microsoft.Playwright

let web =
    Playwright.CreateAsync()
    |> Async.AwaitTask
    |> Async.RunSynchronously

let browser =
    web.Firefox.LaunchAsync(BrowserTypeLaunchOptions(Headless = true))
    |> Async.AwaitTask
    |> Async.RunSynchronously

let page =
    browser.NewPageAsync()
    |> Async.AwaitTask
    |> Async.RunSynchronously

page.GotoAsync("https://duckduckgo.com/")
|> Async.AwaitTask
|> Async.RunSynchronously

let screenshotOptions =
    PageScreenshotOptions(Path = "a_screenshot.png")

page.ScreenshotAsync(screenshotOptions)
|> Async.AwaitTask
|> Async.RunSynchronously
```
I know that this code isn't the best - lots of Task to FSharpAsync conversion and Synchronous waits, but let's get back to this later. Let's run this with `dotnet fsi playwright.fsx`.
...
Kaboom 💥! 
Probably You see this; 
```bash
System.AggregateException: One or more errors occurred. (Driver not found: /.nuget/packages/microsoft.playwright/1.12.2/lib/net5.0/.playwright/node/linux/playwright.sh)
 ---> Microsoft.Playwright.PlaywrightException: Driver not found: .nuget/packages/microsoft.playwright/1.12.2/lib/net5.0/.playwright/node/linux/playwright.sh
```
This is because we didn't install the dependencies as stated in [the docs](https://playwright.dev/dotnet/docs/cli#install-system-dependencies)
We don't need playwright .net tool for that, it is enough to go to the nuget package; 
```bash
/home/marcin/.nuget/packages/microsoft.playwright/1.12.2/Drivers/node/linux
``` 
and install dependencies by executing the script. `/playwright.sh install`. This is one-time operation, You won't to have bother with this anymore. 

### 2.1 Problem with version older than 1.13 
*At the time of writing this post (16-07-2021), 1.13 version is still in preview, in couple of weeks You won't need this step. For now, keep reding;*

Nothing has changed after installation of dependencies? Well - I was a little bit confused, that is why I decided to ask for help on GitHub here;
https://github.com/microsoft/playwright-dotnet/issues/1590 
So the problem is that by default playwright is looking for .playwright folder in the project location - it relies on the build task to copy the `.playwright` to the `bin/Debug/{framework}` location. Since we do scripting here, there is no build task. As You may read in the issue version 1.13 fixes this by defaulting to the .playwright folder in the nuget cache. Let's add this version to the nuget reference in script;
```fsharp
#r "nuget: Microsoft.Playwright, 1.13-next-1"
```
Let's execute the script so that we will find a new version downloaded in nuget cache. The script will fail, we have to install the dependencies again.
```bash
~/.nuget/packages/microsoft.playwright/1.13.0-next-1/.playwright/node/linux $ ./playwright.sh install
```

### 2.2 Let's taste the soup
This should be enough, works for me:
![](/img/playwright/a_screenshot.png)

Can You feel the power already? Your head is full of ideas with what can be automated that way? Do You already want to write user-journey tests using this? I do 😀 Let's try to make the code a little bit more F# friendly first.

## 3. Let's try to make the code more F# friendly.
At first, I came into an idea to create a custom computation expression for playwright with custom syntax that will allow me to do the stuff more o less like this:
```fsharp
playwright {
    visit "https://duckduckgo.com/"
    write "input" "mcode.it"
...
```
Wouldn't be that cool? Let's try! I will leave some comments for You in the code.

```fsharp
#r "nuget: Microsoft.Playwright, 1.13-next-1"
// I am lazy and I don't want to convert Task to FSharpAsync all the time. Let's use Task computation expression from Ply nuget package:
#r "nuget: Ply"

open Microsoft.Playwright
open FSharp.Control.Tasks
open System.Threading.Tasks

type PlaywrightBuilder() =
    // Required - creates default value, which returned value can be passed over next custom keywords. The type
    // returned by the next methods has to conform to the returned value type. So each function will have such signature;
    // Task<IPage> * ... (our parameters) ... -> Task<IPage>.
    member _.Yield _ =
        task {
            let! web = Playwright.CreateAsync()
            let! browser = web.Firefox.LaunchAsync(BrowserTypeLaunchOptions(Headless = true))
            return! browser.NewPageAsync()
        }

    // CustomOperation attribute is the keyword definition that makes it possible to use in our computation expression.
    [<CustomOperation "visit">]
    member _.Visit(page: Task<IPage>, url) =
        task {
            let! page = page
            let! _ = page.GotoAsync(url)
            return page
        }
    
    // And now we go with the repeatable boring stuff...
    [<CustomOperation "screenshot">]
    member _.Screenshot(page: Task<IPage>, name) =
        task {
            let! page = page
            let! _ = page.ScreenshotAsync(PageScreenshotOptions(Path = $"{name}.png"))
            return page
        }

    [<CustomOperation "write">]
    member _.Write(page: Task<IPage>, selector, value) =
        task {
            let! page = page
            let! _ = page.FillAsync(selector, value)
            return page
        }

    [<CustomOperation "click">]
    member _.Click(page: Task<IPage>, selector) =
        task {
            let! page = page
            let! _ = page.ClickAsync(selector)
            return page
        }

    [<CustomOperation "wait">]
    member _.Wait(page: Task<IPage>, seconds) =
        task {
            let! page = page
            let! _ = page.WaitForTimeoutAsync(seconds)
            return page
        }

    [<CustomOperation "waitFor">]
    member _.WaitFor(page: Task<IPage>, selector) =
        task {
            let! page = page
            let! _ = page.WaitForSelectorAsync(selector)
            return page
        }
// Let's create our computation expression and use it!
let playwright = PlaywrightBuilder()

playwright {
    visit "https://duckduckgo.com/"
    write "input" "mcode.it"
    click "input[type='submit']"
    click "text=mcode.it - Marcin Golenia Blog"
    waitFor "text=Yet another IT blog?"
    screenshot "mcode-screen"
}
|> Async.AwaitTask
|> Async.RunSynchronously

```
Isn't that cool?!?!?!?!?!!?! Well... yes and no 😉. Before I write about the drawback let me give You two more points on the code above;
1. Here I've used `Ply` - so our expression is dependent on external library and another computation expression, so the task CE is inside another CE - we have hidden some complexity behind abstraction (I dare to say that computation expression is a kind of abstraction). 
2a. Computation Expression is (at least in my opinion) somehow advanced mechanism. To grasp the how-to You might want to check the whole [blog-series by Scott Wlaschin](https://fsharpforfunandprofit.com/series/computation-expressions/). 
2b. When You are done with Scott, actually [farmer docs in Contributing section has a nice example on how to write computation expression with custom keywords](https://compositionalit.github.io/farmer/contributing/adding-resources/4-creating-builder-syntax/).

### 3.1 Drawbacks
First, the thing about computation expressions is that they do not compose well, mixing them is painful. The best example is this; Try to work with Async and Result without `FsToolkit.ErrorHandling`. Actually nesting them also hurts my eyes - we are back to a lot of curly braces (Hello C#! 😁). However, I am not sure if this is a problem here - I don't see any reasons to mix the playwright computation expression with another one - but that is just a fresh opinion and I might be just wrong. 

The true problem is that We have hidden the native playwright api. If I would publish this code as nuget package I am sure that I will receive tons of issues "This is missing", "That is missing", "I can't do that", "Omg are You dumb? why not chrome?" and so on and so on. Can we fix that? Maybe - I tried to pass the page as a parameter to the computation expression like so; 

```fsharp
type PlaywrightBuilder(page: IPage) =
    member val Page = page

    member this.Yield _ = this.Page

    [<CustomOperation "visit">]
    member this.Visit(_, url) =
        this.Page.GotoAsync(url)
        |> Async.AwaitTask
        |> Async.RunSynchronously
        |> ignore

        this.Page
```
and wanted to remove the Synchronous waits later, but I couldn't figure out how to allow acting on the page in between my computation expression keywords (see comment in code);

```fsharp
let page =
    task {
        let! web = Playwright.CreateAsync()
        let! browser = web.Firefox.LaunchAsync(BrowserTypeLaunchOptions(Headless = true))
        return! browser.NewPageAsync()
    }
    |> Async.AwaitTask
    |> Async.RunSynchronously

let playwright = PlaywrightBuilder(page)

playwright {
    visit "https://duckduckgo.com/"
    // This doesn't work. :O Need load more stuff into the Computation expression + refactor.
    page.ScreenshotAsync(ScreenshotOptions(Path="screenshotFromNativeAPI.png"))
    screenshot "screen.png"
}
```
And I gave up. I am sure that an F# Zealot can handle this but... is it worth it? I just thought to myself, why the hell I decided to do a custom computation expression in the first place? 

### 3.2 A better solution?
I have a strong opinion that better = simpler. What do You think about this code? 
```fsharp
#r "nuget: Microsoft.Playwright, 1.13-next-1"
#r "nuget: Ply"

open Microsoft.Playwright
open FSharp.Control.Tasks

type IPlaywright with
    member this.FFoxPage() =
        task {
            let! ff = this.Firefox.LaunchAsync(BrowserTypeLaunchOptions(Headless = true))
            return! ff.NewPageAsync()
        }

type IPage with
    member this.Screenshot(name) =
        task {
            let! _ = this.ScreenshotAsync(PageScreenshotOptions(Path = $"{name}.png"))
            ()
        }

task {
    use! web = Playwright.CreateAsync()
    let! page = web.FFoxPage()
    let! _ = page.GotoAsync("https://duckduckgo.com/")
    do! page.FillAsync("input", "mcode.it")
    do! page.ClickAsync("input[type='submit']")
    do! page.ClickAsync("text=mcode.it - Marcin Golenia Blog")
    let! _ = page.WaitForSelectorAsync("text=Yet another IT blog?")
    do! page.Screenshot("mcode_page")
}
```
Naaah... toooo simple 🙃 isn't it? 30 lines of code without hard stuff like Custom Computation Expression. Old good extensions methods + full access to native Playwright SDK. I will go with that.

## 4. Conclusions
It was a fun ride with custom computation expressions and hopefully I've inspired You to meet them in person. I believe I have to check Scott Wlaschin posts about them again myself ;) It is easy to forget - CEs are rather hard and not something You use at daily coding (Thank God! Can You imagine learning custom computation expressions built by bunch of different people? And maybe custom keywords?). I am not saying custom expressions are bad, we can do amazing stuff thanks to them like this [dapper wrapper](https://github.com/Dzoukr/Dapper.FSharp) or [Farmer](https://compositionalit.github.io/farmer/). Just make sure that You won't bring more problems to the table than improvements - like I did with playwright CE.

The most important conclusion that I want You to get from this post is that: **👉 AIM FOR SIMPLICITY 👈**. Still, I would use my custom computation expression for simple things and scripts where I need only 10% of playwright rich possibilities (because I already wrote it 🤓). For more complex tasks I would stick to native API with possible extension methods that will make my F# live easier. 
- - -