---
templateKey: blog-post
title: 'Few snippets that prove F# COOLNESS'
date: 2020-04-09T01:00:10.000Z
description: >-
  There's a legend around F# that the language is good for science, academic stuff (yes it is good for this as well but not only). Most people think that functional languages are complicated and thus will make them not productive. Nonsense! Let me introduce you to some cool F# features that can make you more productive. You can put away difficult things into the future, meanwhile use F# to write correct and concise code and create bullet-proof cool apps! Let me start with F# justification as modern language then some functional programming evangelism, after that I will give you some F# selling points.
featuredpost: false
featuredimage: /img/fsharp.webp
tags:
  - 'F#'
---
## 1. Is F# modern language?
Most of the Fsharpers are Csharpers first. Let me write about C# a little bit. Let's look into new C# 8.0 features that you already know and love:
* Pattern matching - we have this in F# since 2005 with features you can dream of (upgraded with active patterns in 2010). For Fsharpers the pattern matching C# is a toy for kids. Examples will come. 
* Using declarations - it is so old in F#...
* Static local functions - so old in F#...
* Nullable ref types - we have Records since 2005. So old...
* Asynchronous streams - we have it for 5 years already
* Default interface methods - you don't need them in functional programming
* Nullable reference types - there is no null in F#. F# won by 15 years
* Null-coalescing assignment - no null in F#

C# 8.0 is with us for some time already isn't it? I have not seen any confirmed features of C# 9.0 but the rumors are saying... Records! We have them for 15 years in F#. People are writing about discards in lambda (boring), or improved pattern matching (can you beat F#? I don't think so), yield expression - yes, yes F# has it.
Let's put the sarcasm aside. Don't get me wrong I still love C# but do you see where it is going? Isn't it functional programming the future? 

## 2. Doubts over doubts... But the word consists of objects... and we do model world-class problems. Besides is functional SOLID?
I have many doubts at the beginning but then I thought that functional programming is so long out there... Lisp (1958), Haskell (1990), Clojure, F# so it would be just good for me to know at least one functional language. According to The Pragmatic Programmer by David Thomas, Andrew Hunt [1] you should learn one language each year (I'm below these expectations anyway) so let it be a functional one. Some time has passed since that moment so let me share with you my experience. Maybe I will accelerate your decision to step into the functional world.

### 2.1 The OO is better for modeling real-world problems.
I am still not sure why I had been thinking that way... worst... I am not sure why so many people think that way! No book, no rule says that. Eric Evans, Vaugh Vernon (the kings of DDD) doesn't say that FP is not suitable for modeling. On the other hand, we have a great book "Domain-Driven Design made functional" by Scott Wlashin which proves F# (F# is used there for examples but it applies to most of the functional languages) excellence in modeling. Furthermore, let me use a graphic regarding OO modeling:

![](/img/oo.png)

If you create software for more than 3 years I am sure you nod your head looking at this picture. Believe me that this is serious. Kelvin Hanney talks about it in his great speech about ["Seven Ineffective Coding Habits of Many Programmers"](https://www.youtube.com/watch?v=ZsHMHukIlJY). One may say 
> yeah sure, but you can do this stuff in FP as well.

However, functional programming is all about implementing behaviors, that are independent of the data passed into them. In languages like Haskell or F# it's extra easy to create new types so you focus on types and behaviors - this simply means that functional programming encourages good modeling (over time, you can model better without even being aware that you are doing it better). On top of that let me give you one quotation:
> object-oriented programming is an exceptionally bad idea which could only have originated in California. - <i>Edsger Dijkstra</i>

If you don't mind a little bit of history let me mention that in 2001, Edsger W. Dijkstra wrote a letter to the Budget Council of The University of Texas about functional programming (Haskell in this case) when they wanted to replace the course we Java. A PDF is available here,
http://www.cs.utexas.edu/users/EWD/OtherDocs/To%20the%20Budget%20Council%20concerning%20Haskell.pdf

### 2.2 SOLID and functional programming
SOLID is a set of universal values and yes I am aware that Wikipedia says that this is OO principle but even the creator of the acronym says:

> The principles of software design still apply, regardless of your programming style. The fact that you’ve decided to use a language that doesn’t have an assignment operator does not mean that you can ignore the Single Responsibility Principle; or that the Open-Closed Principle is somehow automatic. The fact that the Strategy pattern makes use of polymorphism does not mean that the pattern cannot be used in a good functional language - *Robert C. Martin* [1].

From my experience writing SOLID code in the functional paradigm is more automatic (thus easier) than in an object-oriented paradigm. Having this in mind other rules from OO still apply: Principles of package cohesion, Principles of package coupling (you can read about them in [2]).

## 3. F# COOLNESS
That was a long foreword. Let's take a look at some great features that F# has. For the examples, I will use F# scripting capability which is built into the language. I will use F# 5.0 (preview currently) as this version makes it easier to deal with packages in scripts. I just love this feature and I am looking forward to automating some repetitive work tasks using F#. 

### 3.1 Type providers and computation expressions
Type provider is simply an adapter that loads data respecting its schema and then turns this data and schema into types of target programming language. These types can be used by compiler and IntelliSense. Let me give you three examples.

#### World Bank Data
[World Bank Data](https://data.worldbank.org/) is free and open access to global development data that contains many indicators related to poverty and inequality, health, environment, economy and more. F# Type provider makes it easy to do some research about the world. What about charting CO2 emissions of Poland? 

```fsharp
#r "nuget: XPlot.GoogleCharts"
#r "nuget: Fsharp.Data"

open FSharp.Data
open XPlot.GoogleCharts;

let data = WorldBankData.GetDataContext()

data.Countries.``Poland``
    .Indicators.``CO2 emissions (metric tons per capita)``
      |> Chart.Line
      |> Chart.WithTitle "CO2 emissions"
      |> Chart.WithYTitle "Metric tons"
      |> Chart.WithXTitle "Year"
      |> Chart.Show
```

Having this let's execute the script. You can use IDE (alt+enter in VSCode or Visual Studio) or CLI 
```
dotnet fsi --langversion:preview worldbank1.fsx
```
Once F# will be out of preview you can drop the `--langversion` part. The result?
![](/img/post5/worldbank1.png)

How cool is that? There is full IntelliSense for Poland or Indicator name:
![](/img/post5/worldbank3.png)

To show something even more cool let's add Germany to the chart and download the data asynchronously in parallel.

```fsharp 
#r "nuget: XPlot.GoogleCharts"
#r "nuget: Fsharp.Data"

open FSharp.Data
open XPlot.GoogleCharts;

type WorldBank = WorldBankDataProvider<"World Development Indicators", Asynchronous=true>
let data = WorldBank.GetDataContext()

type Chart = 
 static member EntitleCo2 =  
    Chart.WithTitle "CO2 emissions" >> Chart.WithYTitle "Metric tons" >> Chart.WithXTitle "Year"

let countries = [data.Countries.``Poland``; data.Countries.``Germany``]
countries
  |> Seq.map(fun country -> country.Indicators.``CO2 emissions (metric tons per capita)``) 
  |> Async.Parallel 
  |> Async.RunSynchronously
  |> Chart.Line
  |> Chart.WithLabels (countries |> Seq.map(fun country -> country.Name))
  |> Chart.EntitleCo2
  |> Chart.Show
```
![](/img/post5/worldbank2.png)

If you want to see more countries here just extend the countries' array with more names in a type-safe way. One note here - do you see how concise the code is? Most of the code is about chart formatting (title, labels, type). Async operations are extremely easy to handle, fetching data and referencing packages - all that in 22 lines of code that can be run on Linux, Windows, macOS. The browser will be opened for you with the chart included <3.

#### SQL Provider
SqlProvider provides strongly typed syntax to work with databases. It provides types generated from database tables. It works with PostgreSQL, MSSql, SqlLite, Oracle and more. It supports stored procedures, views, automatic constraint navigation and more. Find an example below:
```fsharp
#r "nuget: Fsharp.Data"
#r "nuget: System.Data.SqlClient"
#r "nuget: SQLProvider"

open FSharp.Data.Sql
open System.Data.SqlClient

type sql = SqlDataProvider< 
            ConnectionString = "Server=localhost,1433;Initial Catalog=TestDb;User ID=sa;Password=Strong!Passw0rd;MultipleActiveResultSets=True;Connection Timeout=30;",
            DatabaseVendor = Common.DatabaseProviderTypes.MSSQLSERVER,
            UseOptionTypes = true>

let db = sql.GetDataContext().Dbo
let students =
    query {
        for student in db.Student do
        where (student.Age >= 10 && student.Age < 25)
        select student // strongly typed
    }
(students |> Seq.head).Name |> printf "First student name is %s"
```
You don't have to write database models anymore! SqlProvider supports mapping to record types so you can focus on querying the data and mapping them to domain models. The example contains the next cool F# feature - computation expressions. It provides extra syntax to handle specific operations in a particular context - like the query above. You can also build sequences or handle asynchronous operations. For example, you can list all moves of Psyduck pokemon using the following code:
```fsharp
let getPokemon pokemonName =
    async {
        let! data = Http.AsyncRequestString(sprintf "https://pokeapi.co/api/v2/pokemon/%s" pokemonName, silentHttpErrors = true)
        return Json.deserialize<PokemonInfoDto> data
    }
let pokemonMoves = getPokemon "psyduck" |> Async.RunSynchronously
```

### Html type provider 
That one enables you to parse HTML documents in type safe way. Let me give an example from [4] which made me say "woaaahh" once I executed it.
```fsharp
#r "nuget: Fsharp.Data"

open FSharp.Data

type Species = 
    HtmlProvider<"http://en.wikipedia.org/wiki/The_world's_100_most_threatened_species">
   
Species.GetSample().Tables.``Species list``.Rows 
    |> Seq.iter(fun item -> printf "%s \n" item.``Common name``)
```
That's it! A list of most 100 endangered species is printing on the console in this few lines of code.

### 3.2 Structural equality
In C# when you want to test for equality between objects you have to implement the `IEquatable<>` interface. In F# you have this for free. Consider the example below:

```fsharp
type Person = { Name: string; Surname: string; Age: int}

let person1 = {Name = "Marcin"; Surname = "Golenia"; Age = 30}
let person2 = {Name = "Marcin"; Surname = "Golenia"; Age = 30}
let person3 = {Name = "Mickey"; Surname = "Mouse"; Age = 30}
let pair1 = person1, person3
let pair2 = person2, person3

printfn "%b" (person1 = person2) // prints true
printfn "%b" (pair1 = pair2) // prints true
printfn "%b" (person1 = person3) // prints false
```

Most of the F# types are also automatically comparable. Having these two features allows us to naturally model reality. Consider the example below which uses the same Record type for hierachy representation in the company;
```fsharp
type Person = { Name: string; Surname: string; Age: int}
type CompanyHierarchy = Worker of Person | Manager of Person | Cto of Person

let makePerson companyRole =
    match companyRole with
    | CompanyHierarchy.Manager p | CompanyHierarchy.Cto p | CompanyHierarchy.Worker p -> p

let manager = { Name = "Marcin"; Surname = "Golenia"; Age = 30} |> CompanyHierarchy.Manager
let cto = { Name = "Marcin"; Surname = "Golenia"; Age = 30} |> CompanyHierarchy.Cto
// Test equality and compare
cto > manager |> printfn "%A is greater than %A: %b" cto manager 
cto = manager |> printfn "%A is equal to %A: %b" cto manager
let ctoPerson = cto |> makePerson
let managerPerson = manager |> makePerson
ctoPerson = managerPerson |> printfn "%A is equal to %A: %b" ctoPerson managerPerson 
```
Gives us the following output
```bash
λ dotnet fsi --langversion:preview structuralEquality2.fsx
Cto { Name = "Marcin"
      Surname = "Golenia"
      Age = 30 } is greater than Manager { Name = "Marcin"
          Surname = "Golenia"
          Age = 30 }: true
Cto { Name = "Marcin"
      Surname = "Golenia"
      Age = 30 } is equal to Manager { Name = "Marcin"
          Surname = "Golenia"
          Age = 30 }: false
{ Name = "Marcin"
  Surname = "Golenia"
  Age = 30 } is equal to { Name = "Marcin"
  Surname = "Golenia"
  Age = 30 }: true
```
Isn't that cool? If you want to have structural equality in C# you are doomed to this:
```csharp
namespace ClassLibrary
{
    using System;

    public class Person : IEquatable<Person>
    {
        public string Name { get; }
        public string LastName { get; }
        public int Age { get; }

        public Person(string name, string lastName, int age)
        {
            Name = name;
            LastName = lastName;
            Age = age;
        }

        public bool Equals(Person other)
        {
            if (ReferenceEquals(objA: null, other)) return false;
            if (ReferenceEquals(this, other)) return true;
            return Name == other.Name && LastName == other.LastName && Age == other.Age;
        }

        public override bool Equals(object obj)
        {
            if (ReferenceEquals(objA: null, obj)) return false;
            if (ReferenceEquals(this, obj)) return true;
            if (obj.GetType() != GetType()) return false;
            return Equals((Person) obj);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                var hashCode = Name != null ? Name.GetHashCode() : 0;
                hashCode = (hashCode * 397) ^ (LastName != null ? LastName.GetHashCode() : 0);
                hashCode = (hashCode * 397) ^ Age;
                return hashCode;
            }
        }
    }
}
```
If you want to have something like company hierarchy `IComparable<>` waits for you.
### 3.3 Rich types system
Let me start with a quotation:
> Make illegal states unrepresentable - *Yaron Minsky*

which is frequently mentioned by other tech writers - for example in DDD Made functional by Scott Wlashin, bloggers (including me now), just google this sentence and see for yourself. The idea behind this is to design your types in such a way that making a mistake is simply not possible. Let me give you an example - consider that someone submits a ticket to your system. He has to provide a way of contact. This can be a telephone number or email address or both but at least one. In OO most of us would write two properties and do some validation in the constructor. I hope you wrote a test for this as well. Can we do better? Union types!

```fsharp
type EmailAddress = EmailAddress of string
type TelephoneNumber = TelephoneNumber of string
type Contact = 
      EmailAddressOnly of EmailAddress 
    | TelephoneNumberOnly of TelephoneNumber 
    | EmailAddressAndTelephoneNumber of EmailAddress * TelephoneNumber
type Ticket = {Number: int; Description: string; Contact: Contact }

let telephone = "Test" |> TelephoneNumber
let email = "Test" |> EmailAddress
let tickets = [{ Number = 10; Description = "My pc doesn't work"; Contact = telephone |> Contact.TelephoneNumberOnly };
              { Number = 11; Description = "My pc doesn't work"; Contact = email |> Contact.EmailAddressOnly };
              { Number = 12; Description = "My pc doesn't work"; Contact = (email, telephone) |> EmailAddressAndTelephoneNumber }]
```
We can still do better. Now we can put any string into the email address or telephone to constrain this we can add smart constructors to our types - it is easy to do, you can read more about them in [3]. Usually, in OO no one creates a special value type for such small things. I think that this results from the convention of having one structure, one class in one file and of course the complexity - in F# new type usually takes one line. You can't be so concise in OO language.

Finally let me show you a famous sample in functional world - deck of cards.

```fsharp
type Suit = | Spades | Clubs | Diamonds | Hearts // Union type is choice - pick one 
  
type Face = | Two  | Three | Four  | Five
            | Six  | Seven | Eight | Nine | Ten
            | Jack | Queen | King  | Ace
  
type Card = Face * Suit // Tuple means pair, so card has a face and suit.
type Deck = Card list  // built in list type
```
This code compiles and works! Can a non-technical person read the code? I think that a non-technical person can even modify this code If we ask to add 5th color to our card-domain. Isn't F# perfect language for creating DSL and ubiquitous language? Here's code you can add which creates a full deck and prints it in the console:
```fsharp
let suits = [Spades; Clubs; Diamonds; Hearts]
let faces = [Two; Three; Four; Five; Six; Seven; Eight; Nine; Ten; Jack; Queen; King; Ace]
let deck = [for suit in suits do
            for face in faces do
                yield face, suit]

printfn "%A" deck
```

### 3.6 Type inference and automatic generalization
F# is a strongly typed language with automatic generalization. Consider the following function: 
```fsharp
let addToListIfNotThere list item =
    match (list |> Seq.contains item) with
        | true -> list
        | _ -> item :: list
```
But where are the types? The function signature is `val addToListIfNotThere : list:'a list -> item:'a -> 'a list when 'a : equality`. If you are not familiar with this notation it simply means that addToListIfNotThere is a function that takes a list of any type ('a) and an item of any type and returns a list of any type. The last arrow `->` tells us about the return type of the function, all arrows before are input parameters of each curried function [3]. In many languages, you have to start playing with additional syntax related to generics to have this functionality. Let us change the implementation of the function to check if the item is greater than 0:
```fsharp
let addToListIfNotThereAndGt0 list item =
    match (list |> Seq.contains item) with
        | true | _ when item < 0 -> list
        | _ -> item :: list
```
F# will automaticaly constraint the type for us and conclude the type:
`val addToListIfNotThereAndGt0 : list:int list -> item:int -> int list`.

### 3.5 Files ordering

### 3.6 Pattern matching

### 3.7 Units of measure

### 3.8 R bindings

## Summary
You have all these features with a concise syntax thanks to FP currying, piping and immutability without some noise like curly braces with the full power of .NET in the background. You can even mix these two languages in one solution. There are many great histories in using F# - for example, https://jet.com/ - an online shop that supports millions of customers using microservices. I hope I caught your eye on F#.

References
1. http://blog.cleancoder.com/uncle-bob/2014/11/24/FPvsOO.html *Robert C. Martin*
