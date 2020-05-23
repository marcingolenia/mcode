---
templateKey: blog-post
title: Top wastes in software production
date: 2020-04-03T01:00:10.000Z
description: >-
  We are just people - continuous work in focus for 8 hours is not something we
  are capable of. We have to make short breaks, socialize, drink coffee. Don not
  worry you are not causing any wastes or... or do you? If you do, it is not
  because of a short break or coffee. I will tell you who should be blamed for the
  wase in your company - its Tim Woods! (The article is inspired by the Lean
  production which is also known as Toyota Production System).
featuredpost: false
featuredimage: /img/waste.webp
tags:
  - agile software development
  - lean
---
## Who the hell is Tim Woods?

It is a creature that may live in your company in whole or partially. To be honest it is just an acronym used in Lean vocabulary which may help you to memorize the 8th popular wastes in manufacturing. To have a solid start let's formalize what waste is. Shigeo Shingo, one fo the pioneers of the Toyota Production system believed that waste is one of the greatest threats to business viability. The common definition of waste in Lean is \[1]:

> The use of any material or resource beyond what the customer requires and is wiling to pay for.

Toyota has identified seven major types of non-value-adding waste in business or manufacturing processes \[2]. In the early adaption of Lean in the US and Europe in the 1990s the 8th waste was added (which made TIMWOODS from TIMWOOD). Let's enumerate them with synonyms in square brackets which are closer to software development from <i>Implementing Lean Software Development From Concept to Cash</i> \[3]:

* <b>T</b>ransport \[Handoffs]
* <b>I</b>nventory \[Partially done work]
* <b>M</b>otion \[Task switching]
* <b>W</b>aiting \[Delays]
* <b>O</b>ver production \[Extra features]
* <b>O</b>ver processing \[Relearnign]
* <b>D</b>efects \[Defects]
* <b>S</b>kills \[Unused talent] This one is actually not included in \[3] but let me keep it - I think it is really important.

You may think that 

> Ok but Toyota is producing cars, right? I am doing software you know... you can not drive with your software home...

I was a little bit skeptical when I firstly encountered the "Lean" word. I was thinking more or less the above but then I started to dig. I thought that it could not be that Lean has so much traction across many different industries if it was not something valuable. I am glad I was digging. Let's take a closer look to each of the waste with examples that I lived through. Try to think about this waste now before reading more. Can you identify some of them at your work?

## 1. Transport \[Handoffs]

Do you remember Chinese whispers game (for my polish colleagues it is głuchy telefon)? It is like that. With each handoff the whispered sentence gets more and more malformed. Or better said: with each handoff some knowledge is lost. If you want to reclaim that knowledge additional communication is required to resolve the ambiguities.

##### Real live examples

* Separate frontend team, backend team, database team, maintenance team, (you name the next one).
* Business analysts that puts a line between software engineers and business people.
* Teams working in related areas but located in different locations or worse - timezones.

##### Some ideas to reduce this waste

* Create cross-functional teams.
* Consider Domain-Driven Design.
* Colocate related teams.
* Reduce the number of handoffs (try to look into Kanban).
* Use best communication methods which heavily embraces fast feedback. This simply means that instead of documents the people should work together - pair programming, face to face meetings, simulations, interaction with mockups.

## 2. Inventory \[Partially done work]

Originally in Toyota Production System relates to excess inventory. Excess material causes longer lead time, aging, damage to goods, transport and storage costs, as well as delays. In addition, additional resources hide problems such as production imbalance \[2]. In software development this relates to partially done work. Partially done work means that there is a raw material (for example undeployed changes, unfinished places - TODOs) that waits for us (software engineers) to be taken and used to create truly done work.

##### Real live examples

* TODOs in code.
* Long-living feature branches.
* Undeployed code to production.
* Long waiting user stories, tasks. The longer they wait the more likely they will need to be changed due to changing priorities, requirements, evolving the market.
* Undocumented changes - the code should be self-documenting but you still should keep your project vocabulary or domain-model diagrams up to date.
* Untested code. Writing code without a way to detect a defect immediately is the fastest way to build up an inventory of partially done work \[3].

##### Some ideas to reduce this waste

* Do not leave TODOs in code. Do it now or don't do it at all. If something is important but can wait then create the new task in Jira (or whatever else you use).
* Use trunk-based development.
* Invest in Continous Integration, Continous Deployment.
* Try to divide work into the smallest possible batches. Dealing with small increments is obviously easier.
* Include domain-models updates, glossary updates etc in your team definition of done.
* Advocate for TDD, teach why writing tests is important and how it influences productivity.

## 3. Motion \[Task switching]

Any motion that employees have to perform during their work like looking for, reaching for or stacking parts etc are waste. In software development this maps to task switching. Solving complex software problems requires focus and time. Switching between tasks in not only distracting but often hinders both tasks, which naturally causes that none of them is completed. Multitasking may be a step before inventory waste \[partially done work]. 

Working with accordance with DevOps culture means that the software developers will have to task-switch to handle urgent production issues. However this "waste" provides great motivation to deliver defect-free code, so the team can concentrate on new development \[3]. We mustn't avoid task switching at all costs, rather we should monitor the necessary task-switching and keep the limit low. 

##### Real live examples

* Lot of task in progress for a long time.
* Another employee always asking for help.
* To much meetings (synchronization meetings, scrum meetings, carrying out the interview and so on).
* Production support relies heavily on one or two team members.

##### Some ideas to reduce this waste

* Introduce WIP (work in progress limit)
* Make the always asking for help employee "do the homework first", introduce the help limit (like 2 times per day).
* Consider reorganization - do interviews only on Mondays and the other meeting just after. One idea coming from Elon Musk: just leave the meetings if you see no point in further participation. This may be effective but keep in mind that it will be simply polite to first introduce this idea in your organization.
* Have one or two people rotate off the team every iteration to handle maintenance or introduce "maintenance hour" where the whole team focuses every day (if at all required) on "production issues" and then work on new features.

## 4. Waiting \[Delays]

This simply means that workers have to wait for the next processing step, tool, supply, part, etc or just having no work of lot processing delays. What is more: according to \[3] developers make critical decisions about every 15 minutes and it is naive to think that all the information necessary to make decisions is going to be found in a written document. The decision can be made quickly if the engineer has a good understanding of what the code is supposed to accomplish and/or there is someone in the room who can answer any remaining questions. We also have to pay attention some processes we are running before we force ourself to wait for a build, CI process etc.

##### Real live examples

* Long builds, tests, CI process, deploys.
* Waiting for assigned people to be available (In this place I wanted to say best regards to my friend Marcin D. who was waiting over 2 weeks for access rights to start his job, just sitting at the desks).
* Waiting for big features to be ready before I can get some key smaller features which already can be sold.
* Waiting for me to know exactly what I want before they get going on solving my problem (This one is fully taken from \[3]).

##### Some ideas to reduce this waste

* Apply extreme programming rule [10 minutes build](https://explainagile.com/agile/xp-extreme-programming/practices/10-minute-build/), break the solution into smaller ones, obey the [Cohn Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html).
* Reduce bureaucracy
* Divide big tasks into smaller ones.
* Apply Tracer Bullets \[4], prototypes, embrace minimum viable product \[5].

## 5. Over production \[Extra features]

Did you experience a situation in which the development team decided to add something extra because it was just easy to do? Did you experience a situation where business ordered a feature and did not use it for a very long time (or even not at all)? I did many times. For some of you it may be hard to start to think about this as of waste, but one of the Toyota Production System creators Taiichi Ōno emphasized that overproduction making inventory that is not needed immediately is the worst of the seven wastes of manufacturing \[3] If there is not a clear and present economic need for the feature, it should not be developed. 

##### Real live examples

* Developer implemented a feature that no one wanted. Once my colleague implemented pagination whereas no one asked for this feature.
* Stakeholders, users ask frequently for new features.

##### Some ideas to reduce this waste

* Advocate TDD (again). Obeying its rules eliminates the term "extra features".
* Sometimes it is enough to wait, wishes for new features are often premature.
* Use Kaizen technique of 5W (5 x Why). It is simply about asking why 5 times. Here is a trivial example:

  1. Why do you throw sawdust on the floor? <i> Because the floor is slippery </i>.
  2. Why is it slippery? <i>Because there is oil on the floor.</i>
  3. And why is that? <i>It leaks from the machine</i>.
  4. Why is the oil leaking from the machine? <i>Because it is broken</i>.
  5. Why that happened? <i>Because the shield has worn out</i>. <B>The Root cause!</b>

## 6. Over-processing \[Relearning]

Let me start with original Lean waste - Overprocessing or incorrect processing takes unneeded steps to process the parts. Inefficiently processing due to poor tool and product design, causing unnecessary motion and producing defects \[2]. This can be related to writing to much code. I am a little bit obsessed with this. The best code is not to code at all. When there is code there are bugs, you have to maintain it, you have to write tests which are the only proof that your code is not guilty and that still is not enough. Who will tests your tests? I still love to write code but it has to be precise, concise, exact - more like a Math formula. Last but not least consider my beloved quotation:

> “Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.” - Antoine de Saint-Exupéry, Airman's Odyssey.

In Implementing Lean Software Development \[3] authors write about relearning which simply is rediscovering something we once knew and have forgotten.

##### Real live examples

* Lof of code due to poor modeling skills.
* Coupled code, which drives to copy-paste programming.
* Team is unable to effectively onboard new team members, to introduce new employees they have to rediscover some parts of the system and business knowledge.
* Uneffective backlog refinements, task details do not confront existing business rules and design.

##### Some ideas to reduce this waste

* Advocate TDD (again). Look into DDD. Proper modeling can save a lot of code.
* Create an architectural capability to add features later rather than sooner (for example look into ports & adapters, evolutionary architecture).
* Create knowledge - keep domain diagrams up to date, write self-documenting code, pay attention to naming.

## 7. Defects \[Defects]

Every well-designed system should include self-defense tests which do not let defects into the system at all levels of the Cohn's tests pyramid. Even so the software still fails - it just proves how complex the software nowadays is. Cohn's pyramid originally have 3 levels. Currently at work my team automates at 5 different levels: unit, unit - acceptance (at this level we consider behavior as a unit), integration, UI, main user journeys. Moreover we still do exploratory testing. Some parts are so complex that we still fail but we fail fast. It happens rare so we treat it more like an opportunity to learn rather than a failure. You may ask - putting so much effort to create extensive automated testing is not itself a waste? Shigeo Shingo says that "inspection to prevent defects" is absolutely required of any process, but that "inspection to find defects" is waste \[3]. It is like the old good saying: "Better prevent than cure". 

##### Real live examples

* Defects after code integration.
* Defects after a new feature.
* Defects after fixing another defect.
* Defects because of other system defects.

##### Some ideas to reduce this waste

* Embrace TDD (again).
* Integrate frequently, use trunk-based development (again).
* Automate tests as much as possible to make the regression built-in.
* Consider different strategies for handling external system failures like: accept failure, ignore, retry, compensate, do-nothing. I have designed an invoicing-system once that accepted failures from an external system because it was not crucial to issue the invoice, it was just needed to create the attachment to the invoice which in the worst case can be assisted with some manual work. Talk about these strategies with business people and figure out what bests fits your business needs.

## 8. Skills \[Unused talent]

Its about losing time, ideas, skills, improvements, and learning opportunities by not engaging or listening to your employees. This really happens at a daily basis in many places. This can be viewed from a different perspective - if you know something that can be beneficial to the process but for some reason you decide not to share with that knowledge/skill you are the source of waste.

##### Real live examples

* Burnout
* Weak sense of responsibility

##### Some ideas to reduce this waste

* Read books, attend conferences, ask for training funding.
* People should have the opportunity to run experimentation even if they fail. When they fail, they fail fast, they learn and then they are successful. 

## Summary

Applying Lean in software development can be a powerful technique and works extremely well with agile software development manifesto. I have mentioned a lot of techniques, methods to handle this wastes. This only proves that lean identified real waste and we - software engineering society - are constantly trying to find the best ways to eliminate them (even without being aware that we want to reduce waste that was classified a long time ago). I hope I inspired you to start fighting waste symptoms that you already have in mind. You can start with waste and then look into quality, value, speed, knowledge, people which are also considered in Lean. To help you with that I really recommend the referenced books - you will not regret reading them.

- - -

<small>
References: 

<b>1</b> <i>DevOps Handbook</i> John Willis<br/> <b>2</b> <i>The Toyota Way: 14 Management Principles from the World's Greatest Manufacture</i> Jeffrey K. Liker<br/> <b>3</b> <i>Implementing Lean Software Development From Concept to Cash</i>  Mary and Tom Poppendieck<br/> <b>4</b> <i>The Pragmatic Programmer, 20th Anniversary Edition</i> David Thomas, Andrew Hunt<br/> <b>5</b> <i>The lean startup</i> Eric Ries </small>
