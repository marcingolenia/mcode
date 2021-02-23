---
templateKey: blog-post
title: >-
  Invariants as discriminated unions, validation and always valid objects.
date: 2021-02-28T22:35:00.000Z
description: >-
  Everyone (including me) when applying DDD at some points fights with validation and invariants. Probably You tried different approaches already - validating within the domain, duplicating the validation logic for both: application validation and business rules enforcement, or You tried something else. In this post, we will dig out the old (but still living) "always valid" camp, and by using discriminated unions we will model both - always valid entities and aggregate invariants as types. Examples in F#.
featuredpost: true
featuredimage: /img/du_invariants/agg_rules2.png
tags:
  - 'F#'
  - DDD
---
## 1. Introduction
Before we start let's bring the invariants definition from the blue book [4]
> Invariants, which are consistency rules that must be maintained whenever data changes, will involve relationships between members of the AGGREGATE. Any rule that spans AGGREGATES will not be expected to be up-to-date at all times. Through event processing, batch processing, or other update mechanisms, other dependencies can be resolved within some specified time. But the invariants applied within an AGGREGATE will be enforced with the completion of each transaction.

I won't change the world with this post, what we gonna do is also described in DDD made functional book, especially in "Enforcing Invariants with Type System" chapter [5]. In short - we will use different types to represent "always valid" objects and discriminated unions to represent invariants. To calm some doubts regarding if we dome kind of wrong things here let me bring one more quotation from the mentioned booked [5]:
> In many cases constraints can be shared between multiple aggregates if they are modeled using types ... This is one advantage of functional models over OO models: validation functions are not attached to any particular object and don't rely on global state, so they can easily be reused in different workflows. 

## 2. Examples
#### 2.1 A Foosbal game

```fsharp
type NotEmptyString = internal NotEmptyString of string

module NotEmptyString =
    let create str =
      match String.IsNullOrWhiteSpace(str) with
      | true -> "Non-empty string is required." |> Error
      | _ -> NotEmptyString(str) |> Ok

    let value (NotEmptyString notEmptyString) = notEmptyString
```
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
```
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

I think you get the idea. Let's look into different examples. If this is obvious for you, feel free to go to section 3.

#### 2.2 Issued invoice, paid invoice
#### 2.3 Availible Room, Booked room
#### 2.4 Active employee, former employee
###### 2.5 You name the next one... 😉

## 3. Validation
Let's forget about IO operations and consider each workflow (aka use case) as a 2-phase operation. 
* 1st phase is making of necessary steps to be in the "always valid" entities and value objects world.
* 2nd phase is actual domain action, in which invariants will be maintained.

In real code these 2 phases will be reflected by 2 separate computation expression;
1. Validation
2. Result (actually AsyncResult because of the IO that will take place just after domain operation).

Let's stick with one example - the rest would be just an analogy. Let me go with the foosball game. We will use the shiny new feature of F# 5 - applicative Computation Expressions for validation. Ploeh wrote a validation computation expression for F# Advent 2020 [3] if you are curious how to write such a thing you should check his post. We will use the ready implementation provided by FsToolkit [4]. I have been using this library in many projects because of the nice AsyncResult computation expression. 

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
        | FinishedGame _ -> ["Cannot make a score in finished game."] |> Error
      do! save newGame
    }
```

## 3. Summary
Let me start the summary with a quote from Greg Young's post [1]:
> Without using invariants the first test I should be writing is should_throw_not_a_cyclops_exception_when_cyclops_has_two_eyes() … As soon as I find myself writing this test I should be seeing the language and realizing that I am being silly. - *Greg Young*.

Isn't that another proof of the power of TDD?

I've already mentioned "Make illegal states unrepresentable" in one of the previous posts [2] and this is of particular use in invariants and always valid entities/value objects modeling. I love F# rich type system, and I know that Haskell can do such things as well. You would probably write the code in such a way in more dynamic languages like Clojure - just without types. You wouldn't check the Cyclop for two eyes in the first place. To lower your disbelief (cyclops may sound exotic) let me write few more different test names in this context:
1. `should_throw_not_a_book_exception_when_book_doesnt_have_content()`
2. `should_throw_invalid_company_when_company_address_is_missing()`
3. Fun stuff :D One more; `should_throw_invoice_not_complete_when_total_to_pay_is_missing()`
4. I can't resist... `should_create_invoice_when_total_to_pay_is_there()`

In OO languages you are constraining yourself with a simpler type system, thereby you fall into a validation versus invariants dilemma. You can do "always valid" - sure thing, but you will end up with polymorphism and/or throwing plus catching exceptions. In my humble opinion the problem lays not in which paradigm is better or worse, the problem is that we - as the software engineers community - don't pick the right paradigm (and language) to solve the problem. We stick only to one language that we know best. Let me leave you with a remarkable quotation;

> The limits of my language are the limits of my world - *Ludwig Wittgenstein*.

and one risky opinion; Validation is not a domain concept in terms of DDD, it is your application (layer) job to make sure that commands can be applied to the domain properly. Application can use domain types to perfom validation (or specifacations like in blue book [5]) but the domain remains unaware of this act.

- - -
<b>References:</b><br/>

Websites: <br/>
[1] [Always Valid - Greg Young](http://codebetter.com/gregyoung/2009/05/22/always-valid/) <br/>
[2] [Few snippets that prove F# COOLNESS - Marcin Golenia](../2020-04-20-fsharp_cool/) <br/>
[3] https://blog.ploeh.dk/2020/12/28/an-f-demo-of-validation-with-partial-data-round-trip/
https://github.com/demystifyfp/FsToolkit.ErrorHandling

Books: <br/>
[4] [*Domain-Driven Design: Tackling Complexity in the Heart of Software* - Eric Evans](https://www.goodreads.com/book/show/179133.Domain_Driven_Design) <br/>
[5] [*Domain Modeling Made Functional: Tackle Software Complexity with Domain-Driven Design and F#* - Scott Wlaschin](https://www.goodreads.com/book/show/34921689-domain-modeling-made-functional) <br/>

Source Code: <br/>
[6] [Source code](https://github.com/marcingolenia)<br/>