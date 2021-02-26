---
templateKey: blog-post
title: >-
  Invariants as discriminated unions, validation and always valid objects.
date: 2021-02-26T18:35:00.000Z
description: >-
  Everyone (including me) when applying DDD at some points fights with validation and invariants. Probably You tried different approaches already - validating within the domain, duplicating the validation logic for both: application validation and business rules enforcement, or You tried something else. In this post, we will dig out the old (but still living) "always valid" camp, and by using discriminated unions we will model both - always valid entities and aggregate invariants as types. Examples in F#.
featuredpost: true
featuredimage: /img/du_invariants/agg_rules2.png
tags:
  - 'F#'
  - DDD
---
## 1. Introduction
*Full source code on my [GitHub](https://github.com/marcingolenia/foosball-fifa-official)*

Before we start let's bring the invariants definition from the blue book [7]
> Invariants, which are consistency rules that must be maintained whenever data changes, will involve relationships between members of the AGGREGATE. Any rule that spans AGGREGATES will not be expected to be up-to-date at all times. Through event processing, batch processing, or other update mechanisms, other dependencies can be resolved within some specified time. But the invariants applied within an AGGREGATE will be enforced with the completion of each transaction.

I won't change the world with this post, what we gonna do is also described in DDD made functional book, especially in the "Enforcing Invariants with Type System" chapter [8]. In short - we will use different types to represent "always valid" objects and discriminated unions to represent invariants. To calm some doubts regarding if we dome kind of wrong things here let me bring one more quotation from the mentioned booked [8]:
> In many cases constraints can be shared between multiple aggregates if they are modeled using types ... This is one advantage of functional models over OO models: validation functions are not attached to any particular object and don't rely on global state, so they can easily be reused in different workflows. 

Plus it extra easy to create new types in F# :)

## 1.1 A discussion that you may have or have already had.
*Hi! I am still struggling conceptually with validation and DDD. What's your opinion on throwing exceptions versus returning result codes versus some kind of your functional inventions?*

I like the "your functional inventions" term. Sure, let's talk. Can you give an example so we can have solid ground for the discussion?

*For instance: Given a Date range, a user submits a range which "End date" is before "Start Date". I am in favor of exceptions, however, I know that it will break the execution and go to the exception handler. From the caller's perspective, we also don't know what exceptions can be thrown - we are forced to look into the implementation of more inner modules. Now if we want to do validation here we have to duplicate the code that is used to check if the date range value object is valid, and work with a list of errors.*

You made some very good points. The two drawbacks you have mentioned made me move away from exception throwing while constructing value objects like DateRange.

*So what's your recipe?*

First of all, I don't think that your current way of doing things is bad. For a long time, I have been duplicating the code if I needed validation in the application layer. For me it wasn't that wrong - the domain was using "always valid types" and throwing exceptions while creating these types and validation was simply a different concern.

*Isn't it that the domain is leaking into the application layer?*

I don't think so, you have already told me that it is duplicated - maybe by chance, maybe not. When we read about domain leaking, we always see examples of "moving" domain behaviors to layers or adapters which have nothing to do with the domain, then this behavior is not in the domain - it leaked like the water from a bucket with a hole to another place.

*I see. But cannot we move away from the duplication?*

Let's try to do that. Can we replace the exception with something else?

*Do you mean return codes? Uncle Bob wrote that this is not the best approach - we rely on the trust, that the programmer will check the return code and handle the error case.*

That is correct. Let's try to make Your inner Uncle Bob happy. What if we return some more sophisticated structure than "code"?

*What do you mean?*

A result can be in two states - Ok state and Error state.

*I saw this in C#. That was noisy code, there were some checks IsLeft, IsRight, actions passed to handle Ok state and error state.*

I know what you mean, we tried this approach as well. We moved back from it, because of the noisy code that you described. The reason for the noise code is that C# doesn't support discriminated unions, and an extra code is needed to imitate that behavior.

*What is discriminated union exactly?*

It's an OR. Imagine that you can construct a type that can be a number or a string. We can use it to model a Result that can be OK or Error. We can nest discriminated unions easily so we can model different errors.

*Sounds interesting but I am feeling that the code will be ugly.*

It won't if you will use a language that supports discriminated unions and techniques that supports chaining Results into something useful - like F#.

*Fair enough, but don't we move away from the validation topic? How can we use Result and discriminated unions to remove duplication?*

We are getting there. Let's model now "always" valid" value objects and use a small factory function, which in turn will return the Result type. Imagine you will be able to gather all the results and if everything is literally OK, you do the domain operation. If not, you can gather the errors and do whatever you need to do - for instance, return them in a JSON array with 400 Status Code.

*And F# allows that?*

It allows exactly that and better than ever before thanks to applicative computation expressions. C# allows that as well, but you have to write the "noisy" code. If you need to stick with C# you may be interested in CanExecute pattern described by Vladimir Khorikov [6].

*I will check that. Can you show me the things you described in F#?*

## 2. Examples of Domain with always valid types.
I will stick with Foosball game domain - opening a game, scoring, ending the game. There is full source code on my GitHub [9]. I will also show you briefly one more domain, to ensure you that modeling with "always valid" is possible in most cases (if not in all cases). 

#### 2.1 A Foosbal game
Let's start with simple value objects. NotEmptyString may seem extremely weird for F# newcommers but it's quite popular in F# modeling. 
```fsharp
type NotEmptyString = internal NotEmptyString of string

module NotEmptyString =
    let create str =
      match String.IsNullOrWhiteSpace(str) with
      | true -> "Non-empty string is required." |> Error
      | _ -> NotEmptyString(str) |> Ok

    let value (NotEmptyString notEmptyString) = notEmptyString
```
Let's introduce a TeamColor which is a DU; a type that can be of yellow or black value. It looks like an enum but it is far more powerful. For instance, instead of the simple union case "Yellow", it can be of complex type (like record type). We will see this later on;
```fsharp
// Official championship's colors
type TeamColor = Yellow | Black

module TeamColor =
    let create footballersColor =
      match footballersColor with
        | "yellow" -> Ok Yellow
        | "black" -> Ok Black
        | _ -> Error "Invalid footballers color; acceptable values are: yellow, black"

    let value color =
      match color with
      | Yellow -> "yellow"
      | Black -> "black"
    // shortand; let value = function Yellow -> "yellow" | _ -> "black"
```
Now let's move to the full Game domain;
```fsharp
module Game =

  type GameId = bigint
  type Errors =
    | TeamsMustBeUnique
  type Rules = { MaxSetPoints: byte; MaxSets: byte }
  type TeamId = NotEmptyString
  type Score = { By: TeamId * TeamColor; At: DateTime }
  type SetScores = { Number: byte; Scores: Score list }
  type OpenGame =
    { Id: GameId
      Teams: TeamId * TeamId
      StartedAt: DateTime
      Rules: Rules
      Score: Score list list }
  type FinishedGame =
    { Id: GameId
      Teams: TeamId * TeamId
      StartedAt: DateTime
      FinishedAt: DateTime
      Rules: Rules
      Score: Score list list }

  type Game =
      | OpenGame of OpenGame
      | FinishedGame of FinishedGame

  let recordScore (game: OpenGame) (scoringTeam: TeamId * TeamColor) scoredAt: Game =
      let finishedSets = game.Score.[..^1]
      let currentSetWithNewPoint = [(game.Score |> List.last) @ [{ By = scoringTeam; At = scoredAt }]]
      match (game, scoringTeam) with
      // You can find active pattern matching implementation on GitHub. Let's skip it here to have better focus.
      | SetInPlay -> { game with Score = finishedSets @ currentSetWithNewPoint } |> Game.OpenGame
      | SetWon -> { game with Score = finishedSets @ currentSetWithNewPoint @ [[]] } |> Game.OpenGame
      | GameWon -> { Id = game.Id
                     StartedAt = game.StartedAt
                     Rules = game.Rules
                     Teams = game.Teams
                     FinishedAt = scoredAt
                     Score = finishedSets @ currentSetWithNewPoint
                   } |> Game.FinishedGame

  let openGame rules teams startedAt gameId =
    match teams with
    | (t1, t2) when t1 = t2 -> Errors.TeamsMustBeUnique |> Error
    | _ -> { Id = gameId
             StartedAt = startedAt
             Teams = teams
             Rules = rules
             Score = [ [] ] } |> Ok
```
The most important fact here is that our domain actions act with only valid types (with one exception that we will address in the 4th point);
1. `recordScore` can only happen with an OpenGame - You can't score in a game that was finished right? So we have enforced an invariant here. The `recordScore` can result in a finished game and the rules will be different from now on. Probably in OO you wouldn't change the game to another type (you wouldn't make the illegal state unrepresentable).
2. `recordScore` accepts a scoring team that consists of teamId and the footballers color that it currently plays. 
3. `openGame` accepts some rules, teams, started date, and gameId - these are all types that are always valid.
4. `openGame` also enforces an invariant and it returns an error in the case of not-unique team names. Can we do better here? Of course! We can create always a valid "teams" type which will be a pair of teams and check the uniqueness for us. By doing this we won't need the error here. I wanted to do that, but I left it as it is so we can learn from this together.

I think you get the idea. Let's look into different examples. If this is obvious for you, feel free to go to section 3.

#### 2.2 Issued invoice, paid invoice
Let me omit the basic types like NotEmptyString or VatId for the sake of verbosity, let me just show you PolishZipCode Value Object:
```fsharp

type PolishZipCode = internal PolishZipCode of string

module PolishZipCode =
    let (|Regex|_|) pattern input =
        let m = Regex.Match(input, pattern)
        if m.Success then Some Regex
        else None

    let create (str: string) =
      match str with
      | Regex @"\d{2}-\d{3}" -> PolishZipCode str |> Ok
      | _ -> Error "Invalid"
    let value (AlphaIso2 alphaIso2) = alphaIso2
```
If you need to support more ZipCodes you can introduce international zip-codes format (if acceptable) or introduce discriminated union for more Zip Codes format. Yet another option is to introduce an alias for string if it is enough for you to accept zip-code as a plain unvalidated string. In some domains maybe this is not a problem. Notice what is going on here; We use Value-Objects types as a validation building block. It is a quite good approach, let me bring here quotation by Martin Fowler [5]: 
> While I can represent a telephone number as a string, turning into a telephone number object makes variables and parameters more explicit (with type checking when the language supports it), a natural focus for validation, and avoiding inapplicable behaviors (such as doing arithmetic on integer id numbers). - *Martin Fowler*.

The nice side-effect from the PolishZipCode value object is an active pattern for Regex matching, it could be a good idea to extract that function somewhere. Now the simple domain;
```fsharp
module Invoicing =

  type InvoiceId = bigint
  type Address = {
    City: NotEmptyString
    ZipCode: PolishZipCode
    Street: NotEmptyString
  }
  type Company = {
    Name: NotEmptyString
    VatId: VatId
    Address: Address
  }
  type InvoiceLine = {
    No: byte
    Title: NotEmptyString
    Quantity: byte
    Net: Money
    VatWage: VatWage
  }
  type Invoice = {
    Id: InvoiceId
    IssueDate: DateTime
    DaysToPay: byte
    Issuer: Company
    Client: Company
    Lines: InvoiceLine list
    TotalToPay: Money
  }
  type PaidInvoice = {
    Invoice: Invoice
    PaidOn: DateTime
  }
  type IssuedInvoice =
    | NotPayedInvoice of Invoice
    | PaidInvoice of PaidInvoice

  let setPaid invoice paymentDate =
    {
      Invoice = invoice
      PaidOn = paymentDate
    }
```
Again - domain action accepts always valid invoices, no validation here. It will be done while constructing Value Objects. 

###### 2.3 You name the next example and try to implement it... 😉

## 3. Validation
Let's forget about IO operations and consider each workflow (aka use case) as a 2-phase operation. 
* 1st phase is making of necessary steps to be in the "always valid" entities and value objects world.
* 2nd phase is actual domain action, in which invariants will be maintained.

In real code these 2 phases will be reflected by 2 separate computation expression;
1. Validation
2. Async - because of the IO that will take place just after domain operation, or AsyncResult because I didn't enforce "always valid" entities in the opening game flow, so it will return an error. Even if I would, you can end up in a situation where aggregate action may have to do some kind invariants enforcements which won't succeed and you won't be able to guarantee the domain action success with providing always valid types.

Let's stick with the foosball example - the other one You can do Yourself by an analogy. We will use the shiny new feature of F# 5 - applicative Computation Expressions for validation. Ploeh wrote a validation computation expression for F# Advent 2020 [3] if you are curious how to write such a thing you should check his post. We will use the ready implementation provided by FsToolkit [4]. I have been using this library in many projects because of the nice AsyncResult computation expression. 

```fsharp
module OpenGameFlow =
  let toErrorMessage msg = Result.mapError(fun _ -> msg)
  let toErrorMessages msg = Result.mapError(fun _ -> [msg])

  let create (save: Game -> Async<Unit>)
             maxSets
             maxSetPoints
             (id: int64)
             team1
             team2
             =
    let teams = validation {
      let! team1Id = NotEmptyString.create team1 |> toErrorMessage $"{nameof team1} id cannot be empty."
      and! team2Id = NotEmptyString.create team2 |> toErrorMessage $"{nameof team2} id cannot be empty."
      return {| Team1 = team1Id; Team2 = team2Id |}
    }
    asyncResult {
      let! teams = teams
      let! openedGame = openGame
                         { MaxSets = maxSets; MaxSetPoints = maxSetPoints }
                         (teams.Team1, teams.Team2)
                         DateTime.UtcNow
                         (id |> GameId)
                        |> toErrorMessages $"Names must be unique, but {nameof team1}: {team1} and {nameof team2}: {team2} were given."
      return! save (openedGame |> OpenGame)
    }
```
I hope You can see the 2-phases that I described. I've used anonymous record the carry over the validation result to asyncResult computation expression. Tuples are also nice for that purpose - I leave it up to you. The implementation of `toErrorMessage` is rather poor but does the job if you don't need sophisticated validation. If you need localization then you can provide a better implementation of the function (respecting different error types) and you are good to go - not a big challenge. Let's move on to the make a score flow;

```fsharp
module ScoreFlow =
  let score (readBy: GameId -> Async<Game>)
            (save: Game -> Async<Unit>)
            (id: int64)
            (footballersColor: string)
            (teamId: string)
            =
    let id = id |> GameId
    let footballersColor = (if footballersColor = null then "" else footballersColor).ToLowerInvariant()
    let scoringTeam = validation {
      let! scoringTeam = teamId |> NotEmptyString.create
      and! teamColor = TeamColor.create footballersColor
      return (scoringTeam, teamColor)
    }
    asyncResult {
      let! scoringTeam = scoringTeam
      let! game = readBy id
      let! newGame =
        match game with
        | OpenGame game -> recordScore game scoringTeam DateTime.UtcNow |> Ok
        | FinishedGame _ -> ["Cannot make a score in a finished game."] |> Error
      do! save newGame
    }
```
Note that our Aggregate (Game) can be in two states: Finished and Open. The domain doesn't even allow us to pass the game to the recordSoce domain action, so we pattern match over the game - we do validation which plays nicely with the validation that we already did in phase 1. It can happen that our phase 1 validation will return errors and the game will be finished. In that case, we won't return the error "Cannot make a score in a finished game". I don't find this to be a problem even from the UI perspective. Imagine that at first, you get two errors; ["Non-empty string is required.", "Invalid footballers color; acceptable values are: yellow, black"]. Once you correct the input you get another one; ["Cannot make a score in a finished game."]. I even think this is better; first, we validate the "input" then the action is made.

#### 3.1 A test
Now we can get nice HttpResponse with 400 StatusCode and proper messages from our validation:
```fsharp
[<Theory>]
[<InlineData("", "")>]
[<InlineData(null, null)>]
[<InlineData("", "Team")>]
[<InlineData("Team", null)>]
[<InlineData("", null)>]
let ``GIVEN two teams names AND at least one is empty or null WHEN createGameHandler THEN response is bad request.`` (team1, team2) =
  // Arrange
  let httpRequest = buildMockHttpContext () |> writeToBody { Team1 = team1; Team2 = team2 }
  let root = testTrunk |> composeRoot
  let httpResponse =
    task {
      // Act
      let! httpResponse = HttpHandler.createGameHandler root.CreateGame root.GenerateId next httpRequest
      return httpResponse
    } |> Async.AwaitTask |> Async.RunSynchronously |> Option.get
  // Assert
  httpResponse.Response.StatusCode |> should equal StatusCodes.Status400BadRequest
  if not (String.IsNullOrWhiteSpace team1) then
    httpResponse.Response |> toString |> should haveSubstring "[\"team2 id cannot be empty.\"]"
  elif not (String.IsNullOrWhiteSpace team2) then
    httpResponse.Response |> toString |> should haveSubstring "[\"team1 id cannot be empty.\"]"
  else
    httpResponse.Response |> toString |> should haveSubstring "[\"team1 id cannot be empty.\",\"team2 id cannot be empty.\"]"
```
You can find more tests in the GitHub repository [9].
## 4. Summary
Let me start the summary with a quote from Greg Young's post [1]:
> Without using invariants the first test I should be writing is `should_throw_not_a_cyclops_exception_when_cyclops_has_two_eyes()` … As soon as I find myself writing this test I should be seeing the language and realizing that I am being silly. - *Greg Young*.

Isn't that another proof of the power of TDD?

I've already mentioned "Make illegal states unrepresentable" in one of the previous posts [2] and this is of particular use in invariants and always valid entities/value objects modeling. I love F# rich type system, and I know that Haskell can do such things as well. You would probably write the code in such a way in more dynamic languages like Clojure - just without types. You wouldn't check the Cyclop for two eyes in the first place. To lower your disbelief (cyclops may sound exotic) let me write few more different test names in this context:
1. `should_throw_not_a_book_exception_when_book_doesnt_have_content()`
2. `should_throw_invalid_company_when_company_address_is_missing()`
3. Fun stuff :D One more; `should_throw_invoice_not_complete_when_total_to_pay_is_missing()`
4. I can't resist... `should_create_invoice_when_total_to_pay_is_there()`

In OO languages you are constraining yourself with a simpler type system, thereby you fall into a validation versus invariants dilemma. You can do "always valid" - sure thing, but you will end up with polymorphism and/or throwing plus catching exceptions and/or imitation of discriminated unions which leads to extra code. In my humble opinion the problem lays not in which paradigm is better or worse, the problem is that we - as the software engineers community - don't pick the right paradigm (and language) to solve the problem. We stick only to one language that we know best. Let me leave you with a remarkable quotation;

> The limits of my language are the limits of my world - *Ludwig Wittgenstein*.

and one risky opinion; Validation is not a domain concept in terms of DDD, it is your application (layer) job to make sure that commands can be applied to the domain properly. The application can use domain types to execute validation (or specifications like in blue book [7]) but the domain remains unaware of this act.

- - -
<b>References:</b><br/>

Websites: <br/>
[1] [Always Valid - Greg Young](http://codebetter.com/gregyoung/2009/05/22/always-valid/) <br/>
[2] [Few snippets that prove F# COOLNESS - Marcin Golenia](../2020-04-20-fsharp_cool/) <br/>
[3] [An F# demo of validation with partial data round trip - Mark Seemann](https://blog.ploeh.dk/2020/12/28/an-f-demo-of-validation-with-partial-data-round-trip/) <br/>
[4] [FsToolkit library](https://github.com/demystifyfp/FsToolkit.ErrorHandling) <br/>
[5] [Value Object - Martin Fowler](https://martinfowler.com/bliki/ValueObject.html) <br/>
[6] [Validation and DDD - Vladimir Khorikov](https://enterprisecraftsmanship.com/posts/validation-and-ddd/)

Books: <br/>
[7] [*Domain-Driven Design: Tackling Complexity in the Heart of Software* - Eric Evans](https://www.goodreads.com/book/show/179133.Domain_Driven_Design) <br/>
[8] [*Domain Modeling Made Functional: Tackle Software Complexity with Domain-Driven Design and F#* - Scott Wlaschin](https://www.goodreads.com/book/show/34921689-domain-modeling-made-functional) <br/>

Source Code: <br/>
[9] [Source code](https://github.com/marcingolenia)<br/>