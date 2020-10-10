---
templateKey: blog-post
title: >-
  Create your sprint hawker! Come out of the shadow - make your team efforts and struggles visible.
date: 2020-10-24T20:00:00.000Z
description: >-
  So the company is paying you and other people in the team money for accomplishing certain things... for building products, delivering features, solving problems, doing maintenance. You work hard, so do your peers. What about making the sprint-backlog even more transparent and automate a shout-out of what had been done in the sprint? 
featuredpost: true
featuredimage: /img/hawker.png
tags:
  - agile software development
  - azure
---
## 1. Introduction
Participants in the sprint review typically include the scrum team, management, customers, and developers from other projects (so basically anyone in the company + external people). Let me emphasize that **the review by the development team for the product owner and some kind of manager only is an antipattern**. This antipattern is so popular (at least I was there) that going out of this comfort zone (and antipattern) is hard because you are accustomed to reviewing your work before the people you work with (doesn't this sound stupid?). But once you get out of the comfort zone, you won't ever want to go back. I hope you are there :) So let me introduce an idea - sprint hawker.

## 2. Keeping all those people informed...

## 3. What is sprint hawker anyway?

## 4. Sample implementation using Azure DevOps + Logic Apps and Slack. 

### 4.1 Writing the query

### 4.2 Setting up the logic-app

## 5 People reactions and other conclusions
We were all worried before the first announcement (even after 2 or 3 test runs). The first two things that came to my and other team members minds was;
1. What if we will forget to update the sprint backlog? The hawker will write lies on the slack channel.
    * This didn't happen at all! What we've noticed is that we have been carrying more about the sprint backlog timeliness with the facts. That was the biggest win in my opinion - the transparency simply increased.
2. What if during the sprint we won't achieve anything? Then the hawker will try to sell an empty list.
    * This happened two times but we also noticed that the team also performs better in the review in such a situation. People started behaving more professionally - specific reasons are given, specific problems are marked instead of unnecessary justifications. In the end, the team worked hard, so if it turned out during the implementation of the task that for example, we could not get along with the external supplier or the data contract was broken by another team thus integration took more time or someone has to spend dozen-or-so hours in calls because of urgent issues, why should we treat it as a failure? It is primarily a place to learn and avoid a similar situation in the future. It is an important signal for the organization and other developers that something has to be fixed. The team simply turned failures into learning opportunities. I do not say that the sprint hawker did this, I say that team the team grew up to this and the hawker slightly supported this behavior. 

People outside of the team are also delighted. Everyone knows that every Friday at 1:00 PM there will be an announcement and reminder that in one hour we will start to review our work and show some new cool features! No one has to go to the sprint backlog - everything is listed right in the communication channel. Even is someone is ultra-busy he can quickly catch up when joining the meeting.

I think that you can play a little bit with your hawker. Some ideas:
* Custom message when nothing is delivered at the end of the sprint. Everyone will be rather taken over by this fact so I recommend something happy.
* Let the message contain notes and comments from the last review. Sometimes these are simple tasks that won't turn into user stories. By making this happen we will guarantee that every vote is taken seriously and won't get lost in the pile of all these other important stuff.
* Tell a random joke or interesting fact at the end of the announcement. 

- - -
<b>References:</b><br/>
Websites: <br/>

[1] [Git configuration documentation](https://git-scm.com/docs/git-config) <br/>

