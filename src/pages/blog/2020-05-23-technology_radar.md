---
templateKey: blog-post
title: 'Technology Radar as a knowledge and communication'
date: 2020-05-23T23:20:10.000Z
description: >-
  Radar is a system that uses radio waves to find the position and movement of objects, for example, planes and ships, when they cannot be seen. Analogously Technology radar "uses" engineers and built systems to find the position and movement of languages, platforms, tools, and techniques in trends. In this post I will describe the radar as an actual need in the company and prove its value from a lean perspective.
featuredpost: false
featuredimage: /img/radar.png
tags:
  - lean 
  - 'technology strategy'
---
## 1. Motivation (feel free to skip it)
At my current job a couple of months ago I had a rough discussion with CTO about the need for the existence of an organizational unit named Architecture Board which was about to establish. Let's skip the *architecture* and *architect* words and let me focus on the problem that was addressed. The board was supposed to:
- Control used languages, frameworks, techniques.
- Track the *tech stuff* that was going on in different projects.
- Advice on architecture and hard technical problems.

*Control* and *track* activities were emphasized so I thought about Taylorism and its first step of social engineering which is the separation of planning and execution as well as the second one - the creation of a separate quality department. We should have better ways of control & track in XXI century right? It was the architecture board that should be now responsible for taking important technical decisions without dealing with the consequences and that was my biggest problem. I wish I could say I succeeded in negotiations but I don't. Few things happened;
- I have denied being the member of the board - emphasizing that no one will better know the architecture than the team itself and informing that autonomy was a company selling point when I decided to take the job.
- I have prepared a short presentation about what "an architect" should do (basing actual articles and books by Martin Fowler, Uncle Bob, Sam Newman and Accelerate book).
- I have proposed creating dedicated well-named guilds that were grouped around specific problems like "performance", "security", "CI/CD" and so on. 

I also proposed that the CTO can talk about the architecture with the teams directly if he needs it. I was argued that he doesn't have spare time to talk with his family. The talk was getting quite dirty (private reasons), double standards fallacy, and so on so I gave up. The result is that the architecture board was born, I am not part of it and my team is fully autonomous with some limited standardization resulting from the company interest (like gold Microsoft partnership). You might think about it like a win&win situation (because I have a freedom and CTO has the architecture board) but this is not leadership, you can't inspire others and have a vision by having peace of mind. 

After a while I have a chat with my friend about the whole situation and I've mentioned technology radar. It turned out he didn't know this concept when I gave some explanations he gave an idea that this could fulfill the whole "track" need of the CTO - he could be sure by looking on the radar that no one will adopt a technology which can cost the company a lot of money or cause troubles from any reason. That made me think... As a result I dived more into the topic. I decided to share with you what I have found and concluded putting the radar in the light of Lean - maybe you will be in a similar situation and with this blog post you will handle the situation better than me. That being said... I hope I will counterattack in the coming days.

## 2. Brief History of Technology Radar
In 2008 Daren Smith (General Manager at Thought Works) joined the Technology Advisory Board (TAB) [1]. TAB at Thought works is responsible for identifying trends in technology and help the company properly respond to the trends by communicating to the consultants what they should learn or focus when helping salespeople to understand some of them. To prepare well for the role he examined notes from previous meetings. He tried to classify the technologies and then;
> The image of radar was what came immediately to mind.

So it began. Daren presented the idea of radar on the TAB meeting. They worked on it a little bit and started to use it. The initial version was in the form of one radar, later quartiles were added because the number of technologies made it hard to reason about. The first publically available version was published in 2010. Each year new radar is being published mostly 2 times up to now. You can go to the ThoughtWorks webpage and examine all radars [3]. If you are more interested in the history Daren published the whole article about it [4].
## 3. Anatomy of the radar
The concept is easy to understand and I thought it would be best to prepare a sample radar with description and arrows. 
<br/><br/>

![](/img/radar1.png)
<br/><br/>

This is a good start. Once the radar gets more complicated you can introduce halves or quadrants which you can present as separate artifacts or as one like the following:

![](/img/radar2.png)

I have used "technology 1", "technology 2" but keep in mind that there is no rule that says the radar is good only for techy things. You can use it for finance, management areas as well. Feel free to use the pictures on your own (maybe you want to use them for presentation to CTO or architects?) you can download [svg here](/img/radar.svg).

### Catagories partition rings
Understanding the rings is **extremely important**. If you will fail to create a shared mental-model about them then I fear that whole radar will be useless. Please have a clear mind and think objectively, do not put the rings into subjective categories like "I hate", "It's ok", "I think this might be cool", "I would love to use it!".

#### Hold
First and most important thing - **Hold is not Reject**. It is the closest category to Reject but there is none in the radar. The Reject category was forbidden by ThoughtWorks CTO - Rebecca. A technology that sucked one year ago may turn out to be useful later because of any reason. Even if a technology is dying we can decide to put it on Hold to track what will happen next. Or maybe a particular technology seems to be tempting but early releases are buggy so it needs time to grow up? If yes - put it on hold.

#### Asses
This means that the technology looks promising and developers/architects are looking forward to doing (or even already started doing) research & development in this field to prove its value for the company.

#### Trial
The Trial ring means that we already see potential value to our company and some work in the field has been done to prove it. Active research, development, experiments should have taken place in selected areas of some projects.

#### Adopt
Adopt is the most inner-ring. It simply means that a particular technology works well for the company and is well supported. We should invest time in the adoption of the technology if not yet adopted.

#### Quadrants
My advice is to start with a simple radar. Once you will feel overwhelmed by new technologies on the radar start the division. ThoughtWorks introduced quadrants but I encourage you to make an intermediate step - halves. When halves will meet the "readability" boundary, go with quadrants.
>I remember most of us felt overwhelmed by the amount of technology that we were tracking. That there was no way that we could list out all the technologies and have their names alongside the blips ... so I suggested that we break it out into five graphics instead of one. - *Darren Smith*

### Technologies and shapes
Use the shapes you like on the radar but also make use of them. ThoughtWorks marks new things with up-triangles to mark new things on the radar. I would also use down-triangles to mark something that I thought will be valuable for the company (**Asses**) but after some experimentation, it turned out that it won't play well with our skillset/attitude/values whatever so I will put it to **Hold** to keep an eye on it and look for some more feedback within or outside the company. Remember! It is still not **Reject**, reject don't exist.

#### Descriptions
Descriptions are missing in the drawings but you should add them. This might be a brief simple description of the technology/tool/technique with some links (even link to POC repository) and explanations on why a particular dot is in a particular ring. It's nothing big I think that ThoughtWorks did a good job with descriptions you can take an example from them.

## 4. Radar in the light of Lean
Technology radar can be proved to be a great tool for most of the IT companies. Let's take some lean rules and practices which were proved to be valuable by Toyota and successfully described in a software development context in *Implementing Lean Software Development From Concept to Cash* [8] and which I find to work well with the radar.

#### Nemewashi
Nemawashi can be translated to "Building a consensus" which is the first step in the decision-making process. It is about sharing information about the decision that will be made, to involve all employees in the process. During Nemawashi, a company seeks the opinion of employees about decisions (so it is about feedback). Let's imagine that the company decided to have a technology radar meeting once in 6 months. Before any change/proposal due to the transparency that the Radar offers everyone can give his opinion on the change / new technology. In other words we may influence the decision (ie putting technology to hold) before the decision will be made. Technology radar meetings will make Nemewashi take place. Nemewashi can make the decision process longer - that is ok, it is supposed to take time. We should consider alternatives and respect people's opinions. ThoughtWorks radar building event lasts 4 days and they have 10 years of practice in it. However I would dare to say that this is still cheaper than having a meeting once per week for 2 hours during which the probability of making wrong and/or unfair decisions could be made, based on fallacy arguments is much bigger.

To make Nemewashi even more effective we can build consensus on different levels. Before we introduce the idea before a broad audience we may try to discuss it with a "friendly team" and gain their insight and probably their support.
#### Genchi genbutsu
Genchi genbutsu is extremely straightforward - go and see yourself. Technology radar will enforce on decision triggering people to make their hands dirty to have some proofs and a ready list of pros and cons. If not then they should fail on building consensus (Nemewashi). I love the connection between Nemewashi and Genchi genbutsu as this hits directly the bad practice known as "non-coding architect".

The other side of genchi genbutsu in the light of technology radar is that even if a person will make some valid points baked with research and POC but the actual use of the technology (*Trial*) will turn out to not work well in the real project the person for sure will be informed at the latest on next technology radar meeting that it simply didn't work well in given context. The person should see why and learn from it - do the Hansei (do the reflection).

#### 5s - Seiri, Seiton, Seiso, Seiketsu, Shitsuke
One of the lean principles is "Use Visual Control So No Problems Are Hidden". 5s programs are a series of activities for eliminating wastes that contribute to errors, defects. Here are the five S translated into English:
* (Seiri) Sort - sort through items and keep only what is needed while disposing of.
* (Seiton) Straighten - a place for everything 
* (Seiso) Shine - the cleaning process that has a form of inspection that exposes abnormal and pre-failure conditions that could hurt quality.
* (Seiketsu) Standardize - create rules to maintain and monitor the first three S's. 
* (Shitsuke) Sustain - maintain a stabilized workplace is an ongoing process of continuous improvement.

How the radar fits here? I am sure that in your company some decisions already exist and are scattered through different people, even departments. 5s can be a powerful tool to create the initial technology radar and centralize the knowledge and vision that the company already has in visualized form. In the book about 5s [7] there is important information about 5s that I have to quote;
> The Toyota Way is not about using 5S to neatly organize and label materials, tools, and waste to maintain a clean and shiny environment... Lean systems use 5S to support a smooth flow to takt time. 5S is also a tool to help make problems visible and, if used in a sophisticated way, can be part of the process of visual control of a well-planned lean system. - *Hirano*.

Yes! We do the labeling in technology radar and we keep it clean and shiny but this is not the aim of the radar! The radar indeed should create a smooth flow to takt time of trials, adoptions, holding from technologies. It is also a tool for visual control.

#### Use Only Reliable, Thoroughly Tested Technology That Serves Your People and Processes
At Toyota new technology is often considered as unreliable and difficult to standardize and therefore endangers flow. A proven process that works generally takes precedence over new and untested technology. This perfectly fits the *Assess* nad *Trial* ring in the technology radar. By doing Nemewashi and Genchi-genbutsu we take this even further. Use this rule to make solid and evidence-based decisions while "putting the dots on the radar".

#### Developing Excellent Individual Work While Promoting Effective Team Work
This is the next Lean principle. I have read in [5] that if you talk to somebody at Toyota about the Lean, they for sure will mention the importance of teamwork. However their understanding of teamwork is different than the one in Europe or the US. One American - Sam Heltman who was hired by Toyota formulates differences precisely by saying that Americans think that teamwork is about *you* liking *me* and *I* liking *you*. For Toyota employees it is about mutual respect. That means *I* trust and respect that *you* will do your job so that *we* are successful as a company. It does not mean we just love each other. Having this in mind - excellent individuals performers are required to make up teams that excel. I wish that would be more important to the IT people. 

So how this relates to the radar? 

We have or at least we should do our best to have slack time during sprints right? The importance of this is mentioned in multiple books like Accelerate [6] or [2] and more. This will help us as individuals to innovate by challenging the company radar. By learning others in the team or investing time into research we can make a strong position for a new point to appear on the radar. To sum it up - Having the radar might trigger some individual's actions.

## 5. Radar is not...
First let me note that the radar is more about **future** things **not the past**. You can keep some points on the radar because they are still on **Hold** but you need to track it, or no one had time to **Adopt** the point, etc. However! it is not about 
> I have used framework X it was awful so I put it on hold, 

or worse 
>I don't like language Y so I will put it on Hold.

or even worse! 
>I want to learn Kubernetes because everyone talks about it so I will put it on Adopt!. 

This should be more like
> OK - Kubernetes seems to have traction now, can we try to create a POC for the company? Then someone can come back and we will put it in the right ring.
 
or 
> Dear CTO (anyone decisive) I have strong proof that DDD modeling using algebraic types is a powerful technique. I've used it at home projects and I would be more than happy to try it in a small area in my current project and prepare a demo on it so we can decide if the company can use languages supporting this technique.

You should put your sentiments aside. Be objective, and have a broad and narrow perspective at the same time on technologies. If one technology won't work for you maybe it will work for other teams as they are facing other problems. If the technology or practice you've experimented with seems to be a great fit for most problems (pair programming? TDD? Docker?) why not to **influence** the adoption of it in the company? Notice one thing - by having the radar to add/remove something we have to provide some measurable arguments. I believe that thanks to the radar picking new technologies can be more thoughtful thanks to **transparency** that the radar enforces.

## 6. Personal radar
So you know something about the history of the radar, how it is built, what it is for. Why not use the radar for yourself? I have one for myself - It is easier to create because it is only you to be at the meeting to draw it. If I may give you an advice - keep it private. Some companies like ThoughtWorks have 2 radars - private and public ones. Your personal development is your business - with the use of the radar you can make the *public* radar help your *private* radar to grow and vice versa. One piece of advice - keep it small to stay focused. It won't help you if you put 50 dots on the radar. Can you master them all? I doubt. Prioritize.

## 7. Getting started with the radar
Getting started is easier than you may think. ThoughtWorks gives a free radar generator which basing on google sheets prepares it for you. Just go and see yourself:
https://www.thoughtworks.com/radar/how-to-byor
The google sheet can be private, so it provides some privacy. If this is not enough for you I have good news - the project is opensource and there is even docker-image for it:
https://github.com/thoughtworks/build-your-own-radar. This can serve you for years.


## Summary
I strongly believe that properly running a technology radar creates effective communication based on feedback that replaces the need for centralized control in the organization structure. Especially for CTO:

> Most C-level types get more advice from salespeople than their employees. Why? First, no one wants feedback that they think may be negative, especially when they can make it optional. - *Neal Ford, Director, and Architect at ThoughtWorks*

Does this apply to your CTO? Think about it. Let's force them to be part of our feedback loop.

Notice that ThoughtWorks and other companies had the radar for internal use first. That is something we should understand - there is no silver bullet - one technology can be something to **Adopt** in one context and **Hold** in another context. If you already looked into the ThoughtWorks radar you have an answer why the **Adopt** part is so small numbered. Even if the dots are in the adopt ring remember - ThoughtWorks have also their projects scope limited. Look for inspirations with other companies but always put your needs first.

- - -

<small>
<b>Footnotes:</b>

[1] I like the name - mainly because it does not have *architecture* word in there. Its purpose is rather clear - *Advision* but still, some questions remain. However the **transparent** artifact (radar) that the organizational unit created hits the jackpot. <br/>
<br/><b>References:</b><br/>
Websites:<br/>
[3] *[ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar)*<br/>
[4] *[ThoughtWorks Blog on technology radar birth](https://www.thoughtworks.com/insights/blog/birth-technology-radar)*<br/>
Books:<br/>
[2] *[Extreme Programming](https://www.goodreads.com/book/show/67833.Extreme_Programming_Explained)*, Kent Beck.<br/>
[5] *[The Toyota Way - 14 Management Principles From The World'S Greatest Manufacturer](https://www.goodreads.com/book/show/161789.The_Toyota_Way)*, Jeffrey Liker.<br/>
[6] *[Accelerate: Building and Scaling High-Performing Technology Organizations](https://www.goodreads.com/book/show/35747076-accelerate?ac=1&from_search=true&qid=rC9HOG8xvZ&rank=5)*, Nicole Forsgren, Jez Humble, Gene Kim.<br/>
[7] *[5 Pillars of the Visual Workplace: The Sourcebook for 5S Implementation](https://www.goodreads.com/book/show/2105679.5_Pillars_of_the_Visual_Workplace?ac=1&from_search=true&qid=EvA4eUTK73&rank=1)*, Hirano, Hiroyuki. <br/>
[8] *[Implementing Lean Software Development From Concept to Cash](https://www.goodreads.com/book/show/349417.Implementing_Lean_Software_Development?ac=1&from_search=true&qid=6KGlL92tlf&rank=1)*, Mary and Tom Poppendieck