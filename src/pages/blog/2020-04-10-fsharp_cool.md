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

## 2. Doubts over doubts... But the word consists from objects... and we do model world-class problems. Besides is functional SOLID? What about an ORM? 
I have just mentioned a few things that I had been thinking about when I met the functional paradigm at first. Let me share with you with my experience thanks to this maybe I will accelerate your change of faith.

### 2.1 OO is better for modeling real-world problems.
I am still not sure why I had been thinking that way... worst... I am not sure why so many people think that way! No book, no rule says that. Eric Evans, Vaugh Vernon (the kings of DDD) doesn't say that FP is not suitable for modeling. On the other hand, we have a great book "Domain-Driven Design made functional" by Scot Wlashin which proves F# (F# is used there for examples but it applies to most of the functional languages) excellence in modeling. Furthermore, let me use a graphic regarding OO modeling:

![](/img/oo.png)

Don't get me wrong but this is so true... If you create software more than 3 years I am sure you nod your head looking at this picture. Believe me that this is serious. Kelvin Hanney talk about it in his great speech about ["Seven Ineffective Coding Habits of Many Programmers"](https://www.youtube.com/watch?v=ZsHMHukIlJY). Let me give you one quotation:
> object-oriented programming is an exceptionally bad idea which could only have originated in California. - <i>Edsger Dijkstra</i>
TODO
In 2001, Edsger W. Dijkstra wrote a letter to the Budget Council of The University of Texas. A PDF is available here,
http://www.cs.utexas.edu/users/EWD/OtherDocs/To%20the%20Budget%20Council%20concerning%20Haskell.pdf