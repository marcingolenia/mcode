---
templateKey: blog-post
title: >-
  Simple netcore F# app to control Spotify from the terminal on Linux
date: 2020-08-16T20:00:00.000Z
description: >-
  I am addicted to Spotify, I have Linux, I L💖ve F# so I decided to give it a try to control Spotify on Linux using Terminal. Join the ride! We will add a nice feature that will allow us to download lyrics of the current song and we will meet D-bus and Argu - F# library which makes building CLI apps fun! I will also show you how to publish and use the app in Linux.
featuredpost: false
featuredimage: /img/slinux.png
tags:
  - 'F#'
---
## 1. Introduction
Lately, I got inspired by the python program [spotify-cli-linux](https://github.com/pwittchen/spotify-cli-linux) written by my friend. I decided to write the port of this app in .net core in F#. If you can't way to see the source code [here it is](https://github.com/marcingolenia/spotify-cli-linux).
## 1.1 D-bus
D-Bus is a message bus system, which allows inter-applications communication. Also, D-Bus helps coordinate process lifecycle; it makes it simple and reliable to code a "single instance" application or daemon, and to launch applications and daemons on demand when their services are needed. Linux desktop environments take advantage of the D-Bus facilities by instantiating not one bus but many:
* A single system bus, available to all users and processes of the system, that provides access to system services (i.e. services provided by the operating system and also by any system daemons).
* A session bus for each user login session, that provides desktop services to user applications in the same desktop session, and allows the integration of the desktop session as a whole. Spotify belongs here.

The purpose of D-Bus should be clear - simplify:


![](/img/dbus.png)

You can read more about D-Bus on freedesktop.org [1]. We will focus on Spotify but The list of Desktop apps using D-Bus is long and may give you some inspiration [2]. Before we start to code let me introduce you D-Feet which is a nice GUI app which allows you to control and explore D-Bus:

![](img/dfeet.png)

It may help you to get to know the D-Bus interface of the application you want to integrate with. You can even send some signals and test the application behavior without writing any code.

## 2. Connecting to D-Bus with F# and interacting with Spotify.
How to connect to D-Bus using .NET? I googled a little bit and found [Tmds.Dbus package by Tom Deseyn [3]](https://github.com/tmds/Tmds.DBus) which seems to be the easiest way (and the moment probably the only way if you don't want to struggle with sockets, buffers, streams, etc). The samples are in C# but I did not see any obstacles to write the code in F# and hide the package object-oriented nature behind more functional friendly mechanisms.

According to documentation to model a D-Bus interface using Tmds.DBus we create a .NET interface with the `DBusInterface` attribute and inherit `IDBusObject`. We can do this in F# easily. Next, a D-Bus method is modeled by a method in the .NET interface. The method must to return Task for methods without a return value and Task<T> for methods with a return value. Following async naming conventions, we add Async to the method name. In case a method has multiple out-arguments, these must be combined in a struct/class as public fields or a C# 7 tuple. The input arguments of the D-Bus method are the method parameters.

I don't like some ideas in the library but it's made in C# for C# devs for sure so let's be happy that someone did the hard work for us [4]. Let me show you the code which creates the D-Bus connection and simple API which will allow us to use the module in a more F# friendly way.

```fsharp
namespace Spotify.Dbus

open System
open System.Collections.Generic
open System.Threading.Tasks
open Tmds.DBus

module SpotifyBus =
    type Signal = Play | Stop | Pause | NextSong | PreviousSong | PlayPause
    type PlaybackStatus = Playing | Paused | Stopped
    type Song = {
        Title : string
        Artists: string[]
        Album: string
        Url: Uri
    }
    
    [<DBusInterface("org.mpris.MediaPlayer2.Player")>]
    type IPlayer =
        inherit IDBusObject 
        abstract member NextAsync : unit -> Task
        abstract member PreviousAsync : unit -> Task
        abstract member PauseAsync : unit -> Task
        abstract member PlayAsync : unit -> Task
        abstract member StopAsync : unit -> Task
        abstract member PlayPauseAsync : unit -> Task
        abstract member GetAsync<'T> : string -> Task<'T>
    let private player =
        Connection.Session.CreateProxy<IPlayer>("org.mpris.MediaPlayer2.spotify",
                                                             ObjectPath("/org/mpris/MediaPlayer2"))   
```
This should be simple enough;
1. `Signal` is a union type that can be used to manipulate the player.
2. `PlaybackSatatys` is a union type that will represent player playback status.
3. `Song` is a record that will hold song data retrieved from the player.
4. `IPlayer` is an interface that inherits the `IDBusObject` interface according to documentation. It has to be public, otherwise Tmds.Dbus will fail to do anything (including internal access modifier).
5. `IPlayer` methods represent D-Bus operations - signals and method for data retrieval `GetAsync<'T>`.
6. Finally, we create the proxy - `player` instance which will be used for actual operations. Let's keep it private in the module - C# Tasks are not natural to F# and let's hide data retrieval behind clean API. To Create the proxy we have to pass service name and object path. The low-level D-Bus protocol, and corresponding libdbus API provides this concept. The idea of an object path is that higher-level bindings can name native object instances, and allow remote applications to refer to them. 

Time to retrieve the song and playback status:

```fsharp
let retrieveCurrentSong =
    async {
        let! metadata = player.GetAsync<IDictionary<string, Object>> "Metadata" |> Async.AwaitTask
        return {
            Title = string metadata.["xesam:title"]
            Artists = metadata.["xesam:artist"] :?> string[]
            Album = string metadata.["xesam:album"]
            Url = Uri(string metadata.["xesam:url"])
        }
    }

let getStatus =
    async {
        let! status = (player.GetAsync<string>("PlaybackStatus") |> Async.AwaitTask)
        return match status with
                    | "Playing" -> Playing
                    | "Paused" -> Paused
                    | _ -> Stopped
    }
```
If you wonder how I knew about the Dictionary keys - well I simply used the Mentions D-Feet app to examine the contents. The test below demonstrates module usage:

```fsharp
open System
open Spotify.Dbus
open Xunit
open SpotifyBus
open FsUnit

[<Fact>]
[<Trait("Category","SpotifyIntegration")>]
let ``GIVEN retrieveCurrentSong WHEN Song is selected in Spotify THEN the title, artist, url, album are retrieved`` () =
    // Act
    let song = retrieveCurrentSong |> Async.RunSynchronously
    // Assert
    song.Title |> should not' (be EmptyString)
    song.Artists |> Seq.head |> should not' (be EmptyString)
    song.Album |> should not' (be EmptyString)
    string song.Url |> should not' (be EmptyString)
    sprintf "%A" song |> Console.WriteLine
```

#### 2.1 Manipulating the player
The hard work is done (actually it wasn't that was it?) Let's implement play/pause/next/previous, etc signals:

```fsharp
let send signal =
    match signal with
    | Play -> player.PlayAsync()
    | Stop -> player.StopAsync()
    | Pause -> player.PauseAsync()
    | PlayPause -> player.PlayPauseAsync()
    | PreviousSong -> player.PreviousAsync()
    | NextSong -> player.NextAsync()
    |> Async.AwaitTask
```

Oh yeas, pattern matching |> I Love. That's it! The tests;

```fsharp
(* 200ms seems to work well. This interval is required to make the tests pass because it takes some time to accept the
D-Bus message and perform actual actions by Spotify. Remember to turn on Spotify ;) *)

[<Fact>]
[<Trait("Category","SpotifyIntegration")>]
let ``GIVEN send NextSong WHEN Song is changed THEN it is different then previous song`` () =
    // Arrange
    let songBeforeNext = retrieveCurrentSong |> Async.RunSynchronously
    // Act
    NextSong |> send |> Async.RunSynchronously
    // Assert
    Async.Sleep 200 |> Async.RunSynchronously
    let actualSong = retrieveCurrentSong |> Async.RunSynchronously
    songBeforeNext |> should not' (equal actualSong)

[<Fact>]
[<Trait("Category","SpotifyIntegration")>]
let ``GIVEN send Play WHEN Song is Paused THEN the resulting status is Playing`` () =
    // Arrange
    Pause |> send |> Async.RunSynchronously
    // Act
    Play |> send |> Async.RunSynchronously
    // Assert
    Async.Sleep 200 |> Async.RunSynchronously
    getStatus |> Async.RunSynchronously |> should equal Playing

[<Fact>]
[<Trait("Category","SpotifyIntegration")>]
let ``GIVEN send Pause WHEN Song is Playing THEN the resulting status is Paused`` () =
    // Arrange
    Play |> send |> Async.RunSynchronously
    // Act
    Pause |> send |> Async.RunSynchronously
    // Assert
    Async.Sleep 200 |> Async.RunSynchronously
    getStatus |> Async.RunSynchronously |> should equal Paused
```
This works like a charm. I have the tests skipped in Github's actions for the obvious reason - Spotify is not installed on GitHub agents.

## 3. Downloading lyrics
There was a time that Spotify offered this feature but it was removed for unknown reasons. I miss it so let's add this feature to our CLI app. I've created a separate project for this so I can change the API easily without touching D-Bus. I've found a simple and free API named [Canarado](https://api.canarado.xyz/) that allows us to search for lyrics by song name. Let's do this and filter out the matching artist. If our filtering will cause an empty result let's return the original set of lyrics. I've started with learning tests [4] that can be found in the repository if you are interested. The code is simple;
```fsharp
namespace Lyrics.CanaradoApi

open System
open System.Text
open FSharp.Data
open FSharp.Json

module CanaradoApi =
    type Status =
        { Code: int
          Message: string
          Failed: bool }
    type Lyric =
        { Title: string
          Lyrics: string
          Artist: string }
    type CanadaroSuccessResponse =
        { Content: Lyric list
          Status: Status }
    type CanadaroErrorResponse =
        { Status: Status }
    type String with
        member x.Equivalent(other) = String.Equals(x, other, System.StringComparison.CurrentCultureIgnoreCase)

    let fetchByTitle title =
        let config = JsonConfig.create (jsonFieldNaming = Json.lowerCamelCase)
        let response = Http.Request(sprintf "https://api.canarado.xyz/lyrics/%s" title, silentHttpErrors = true)
        let responseText =
            match response.Body with
            | Text jsonText -> jsonText
            | Binary binary -> Encoding.UTF8.GetString binary
        match response.StatusCode with
        | 200 -> Some((Json.deserializeEx<CanadaroSuccessResponse> config responseText).Content)
        | _ -> None

    let private applyArtistFilter artist lyrics =
        let filteredLyrics = lyrics |> List.filter (fun lyric -> lyric.Artist.Equivalent artist)
        match filteredLyrics with
        | [] -> Some lyrics
        | _ -> Some filteredLyrics

    let fetch title (artist: string) =
        (fetchByTitle title) |> Option.bind (applyArtistFilter artist)
```
Few comments here;
1. First I have declared a few types to return the responses in a clear and readable way.
2. `type String with member x...` is an extension method which will help to compare strings in current culture case insensitive way.
3. `fetchByTitle` does the actual work with Canarado API. First we grab the response body to responseText field and in case of success we deserialize the response to our CanadaroSuccessResponse Type. The function returns the lyrics list and is public so the client can decide to retrieve lyrics by title only.
4. `let fetch title (artist: string)` filters the lyrics by the artist.

The test:
```fsharp
module Tests

open Lyrics.CanaradoApi
open Xunit
open FsUnit

[<Fact>]
let ``GIVEN title and artist WHEN fetchLyrics matches lyrics THEN list of matching lyrics is returned`` () =
    let (artist, title) = ("Rammstein", "Ohne Dich")
    let lyricsResult = CanaradoApi.fetch title artist
    let ``Ohne dich by Rammstein`` = lyricsResult.Value |> List.head
    ``Ohne dich by Rammstein``.Artist |> should equal artist
    ``Ohne dich by Rammstein``.Title |> should contain title
    ``Ohne dich by Rammstein``.Lyrics.Length |> should be (greaterThan 100)
```
That was simple, wasn't it?

#### 3.1 Canarado stopped to return lyrics. 
At the time of writing the blog post something happened to Canarado and it stopped to return the lyrics (its empty string now). I've created the GitHub issue here: https://github.com/canarado/node-lyrics/issues/1. If the situation won't change in a week or two I will write an update to the blog post with chapter 3.2 with an alternative.

## 4. Creating the CLI with Argu
Let's do a quick recap:
1. We have an adapter to communicate with Spotify.
2. We have an adapter to retrieve lyrics.

Let's host these functionalities now by command-line app. To help with arguments parsing I was looking at two libraries:
1. System.CommandLine [6] - This is my default when I do C# CLI.
2. Argu [5]- something new writing in F# for F# CLI.

I decided to give it a try with Argu. I have started with arguments specification;

```fsharp
module Spotify.Dbus.Arguments

open Argu

type Arguments =
    | [<First>] Play
    | [<First>] Pause
    | [<First>] Prev
    | [<First>] Next
    | [<First>] Status
    | [<First>] Lyrics

    interface IArgParserTemplate with
        member arg.Usage =
            match arg with
            | Play -> "Spotify play"
            | Pause -> "Spotify pause"
            | Prev -> "Previous song"
            | Next -> "Next song"
            | Status -> "Shows song name and artist"
            | Lyrics -> "Prints the song lyrics"
```
I am not sure if I've modeled the requirement that you can specify only one argument when running the app - If you know Argu better than me let me know in the comments I will be happy to change this. I couldn't find a better way in docs or examined examples. All in all the `[<First>]` attribute means that the argument has to be in the first place - in another case Argu will return an error during command argument parsing. The interface with the `Usage` member helps to generate usage instructions: 
```bash
spot --help
USAGE: dotnet [--help] [--play] [--pause] [--prev] [--next] [--status] [--lyrics]

OPTIONS:

    --play                Spotify play
    --pause               Spotify pause
    --prev                Previous song
    --next                Next song
    --status              Shows song name and artist
    --lyrics              Prints the song lyrics
    --help                display this list of options.
```
Finally, let's look into Program.cs:
```fsharp
open System
open Argu
open Lyrics.CanaradoApi
open Spotify.Dbus
open Arguments

let formatLyric (lyric: CanaradoApi.Lyric) =
    sprintf "%s - %s %s%s %s" lyric.Artist lyric.Title Environment.NewLine lyric.Lyrics Environment.NewLine

let retrieveLyrics title artist =
    let lyrics = CanaradoApi.fetch title artist
    match lyrics with
    | Some lyrics -> ("", lyrics) ||> List.fold (fun state lyric -> state + formatLyric lyric)
    | None -> "Lyrics were not found :("

let errorHandler = ProcessExiter (colorizer = function | ErrorCode.HelpText -> None | _ -> Some ConsoleColor.Red)

let execute command =
    async {
        match command with
        | Play ->
            do! SpotifyBus.Play |> SpotifyBus.send
            return None
        | Pause ->
            do! SpotifyBus.Pause |> SpotifyBus.send
            return None
        | Next ->
            do! SpotifyBus.NextSong |> SpotifyBus.send
            return None
        | Prev ->
            do! SpotifyBus.PreviousSong |> SpotifyBus.send
            return None
        | Status ->
            let! status = SpotifyBus.retrieveCurrentSong
            return Some(sprintf "%s - %s" (status.Artists |> String.concat " feat ") status.Title)
        | Lyrics ->
            let! status = SpotifyBus.retrieveCurrentSong
            return Some(retrieveLyrics status.Title status.Artists.[0])
    }

[<EntryPoint>]
let main argv =
    let parser = ArgumentParser.Create<Arguments>(errorHandler = errorHandler)
    let command = (parser.Parse argv).GetAllResults() |> List.tryHead
    match command with
    | Some command -> try 
                        match execute command |> Async.RunSynchronously with
                        | Some text -> printfn "%s" text
                        | None -> ()
                      with | ex -> printfn "Couldn't connect to Spotify, is it running?"
    | None -> printfn "%s" <| parser.PrintUsage()
    0
```
Some comments to the code:
1. `formatLyric` and `retrieveLyrics` are helper-functions to format a list of lyrics into a string that can be printed to the screen in user-friendly form.
2. `errorHandler` is Argu function which executes when parsing error occurs. The `function` keyword is called "pattern matching function" and is equivalent to:
```fsharp
let errorHandler2 = ProcessExiter (fun(code) -> match code with | ErrorCode.HelpText -> None | _ -> Some ConsoleColor.Red)
```
3. `execute = command -> Async<string option>` is a function which takes the parsed by Argu's argument and handles it (uses spotifyBus or asks for lyrics).
4. In the first line of the main method we create the parser by passing our Arguments interface described in previous source code listening.
5. Finally, we parse the command the execute the action or we print the text with instructions if no argument was passed.

Done!

## 5. Publishing the app, adding aliases.

To publish the app let's navigate in the terminal to our project with the CLI project and use command `dotnet publish -c Release -r linux-x64`. We should get `Spotify.Console.dll`. Now we can navigate to something like `~/src/Spotify.Console/bin/Release/netcoreapp3.1/linux-x64` and run our app `dotnet Spotify.Console.dll --help`. Or we can write a full "dll" path and stay in the terminal where we are. This isn't comfortable at all, is it? Let's create an alias by typing in the terminal:
```bash
alias spot='dotnet ~/projects/spotify-linux-published/Spotify.Console.dll'
```
Now we can use `spot --help`, `spot --next` and so on easily! Remember that the alias will vanish upon reboot. To make it live longer we have to put the alias here: `/home/[user]/.bash/.bash_aliases`. Simply add the same line at the end of the file (create the file if it doesn't exist). Save and close the file, a reboot is not required, just run this command `source ~/.bash_aliases` and you are good to go! Have fun.

## 6. Conclusions
We have covered a lot! 
* D-Bus - what is it, how to establish the communication in dotnet.
* Argu - CLI argument parsing made easy.
* Publishing dotnet app on Linux, creating aliases.
* Some F# modeling, cool tests, fun functions!

I use my new commands daily. It's easier to open terminal (I use Guake Terminal so ctrl +`) and type spot --next instead opening Spotify, look for the control and press it. Printing the lyrics is equally fun. Hear you next time!

- - -
<small>
<b>Footnotes:</b><br/>
[4] To be honest I really don't like the Async postfix in methods names - I understand that they are needed in libraries which have to support both synchronous and asynchronous model but besides I see them obsolete. And interfaces... well... the library is written in C#, samples are in C# so It is written for C# developers, let's just do what we have to do and let's be happy that F# supports interfaces.<br/>
<b>References:</b><br/>

Websites: <br/>
[1] [Freedesktop site with D-Bus description](https://www.freedesktop.org/wiki/Software/dbus/) <br/>
[2] [Not-complete list of desktop apps using D-Bus](https://www.freedesktop.org/wiki/Software/DbusProjects/) <br/>
[3] [Tmds.Dbus package project github](https://github.com/tmds/Tmds.DBus) <br/>
[4] [My article about learning tests](https://mcode.it/blog/2020-07-26_learning_tests/)<br/>
[5] [Argu page on fsprojects](https://fsprojects.github.io/Argu/)<br/>
[6] [System.CommandLine netcore package](https://github.com/dotnet/command-line-api) 
