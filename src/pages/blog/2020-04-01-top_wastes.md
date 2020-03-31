---
templateKey: blog-post
title: 'Top wastes in sofware production'
date: 2020-04-01T19:09:10.000Z
description: >-
  We are just people - continous work in focus for 8 hours isn't something we are capable of. We have to make short breaks, socialize, drink coffee. Don't worry you aren't causing any wastes or... or do you? If you do, it's not because of short break or coffee. I will tell you who should be blamed for the wase in your company - its Tim Woods! (The article is inspired by lean production also known as Toyota Production System).
featuredpost: false
featuredimage: /img/waste.webp
tags:
  - 'agile software development'
---
## Who the hell is Tim Woods?
It's a creature that may live in your company in whole or partially. To be honest it's just an acronym used in Lean vocabulary which may help you to memorize the 8th pupolar wastes in manufactoring. To have a solid start let's formalize what waste is. Shigeo Shingo, one fo the pioneers of Toyota Production system believed that waste is one of the greates threats to business viability. The common definition of waste in lean is [1]:
> The use of any material or resource beyond what the customer requires and is wiling to pay for.

Toyota has identified seven major types of non-value-adding waste in business or manufacturing processes [2]. In early adaption of lean in US and Europe in 1990s the 8th waste was added (which made TIMWOODS from TIMWOOD). Let's enumerate them with synonims in square brackets which are closer to software development from <i>Implementing Lean Software Development From Concept to Cash</i> [3]:
* <b>T</b>ransport [Handoffs]
* <b>I</b>nventory [Partially done work]
* <b>M</b>otion [Task switching]
* <b>W</b>aiting [Delays]
* <b>O</b>ver production [Extra features]
* <b>O</b>ver processing [Relearnign]
* <b>D</b>efects [Defects]
* <b>S</b>kills [Unused talent] This one is actually not included in [3] but let me keep it - I think it is really important.

You may think that 
> Ok but Toyota is producing cars right? I am doing software you know... you can't drive with your software home...

I was a little bit sceptical when I firstly encountered the "Lean" word. I was thinking more or less the above but then I started to dig. I thought that it couldn't be that lean has so much traction across many different industries if it wasn't something valueable. I'm glad I was digging. Let's take a closer look to each of the waste with examples that I lived through. Try to think about the waste now before reading more. Can you identify some of them at your work?

## 1. Transport [Handoffs]
Do you remember chinese whispers game (for my polish colleagues it's głuchy telefon)? It's like that. With each handoff the whispered sentence gets more and more malformed. Or better said: with each handoff some knowledge is lost. If you want to reclaim that knowledge additional communication is required to resolve the ambiguities.
##### Real live examples
* Separate frontend team, backend team, database team, mantainance team, (name the next one).
* Business analysts
* Teams working in related areas but located in different locations or worse - timezones.

##### Some ideas to reduce this waste
* Create cross-functional teams
* Colocate related teams
* Reduce the number of handoffs (try to look into Kanban)
* Use best communication methods which heavily embraces fast feedback. This simply means that instead of documents the people should work together - pair programming, face to face meetings, simulations, interaction with mockups

### How to fight 
## Inventory [Partially done work]
## Motion [Task switching]
## Waiting [Delays]
## Over production [Extra features]
Did you expierenced a situation where development team decided to add something extra becouse it was just easy to do? Did you expierence a situation where business ordered a feature and didn't use it?
I will start with a quotation that I am in love with:
 > “Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.” Antoine de Saint-Exupéry, Airman's Odyssey.

I am a little bit obsessed with this. The best code is not to code at all. When there is code there are bugs, you have to mantain it, you have to write tests which are the only proof that your code is not guilty and that still is not enough. Who will tests your tests? I still love to write code but this code has to be deadly precise - like math formula.
### Example that I've expierenced

## Over processing [Relearning]
## Defects [Defects]
## Skills [Unused talent]

## Summary
I toched only the tip of the iceberg. Applying lean in software development can be a powerful technique and works extremely well with agile software development manifesto. I hope I inspired you to start fighting waste symptoms that you already have in mind. You can start with waste and then look into quality, value, speed, knowledge, people. To help you with that I really recommend the referenced books - you won't regret reading them.

---
<small>
References: 

<b>1</b> <i>DevOps Handbook</i> John Willis<br/>
<b>2</b> <i>The Toyota Way: 14 Management Principles from the World's Greatest Manufacture</i> Jeffrey K. Liker<br/>
<b>3</b> <i>Implementing Lean Software Development From Concept to Cash</i>  Mary and Tom Poppendieck
</small>