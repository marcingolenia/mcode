---
templateKey: blog-post
title: >-
  Create your sprint hawker! Make your team's efforts visible and increase transparency.
date: 2020-11-28T15:00:00.000Z
description: >-
  So the company is paying you and other people in the team money for accomplishing certain things... for building products, delivering features, solving problems, doing maintenance. You work hard, so do your peers. What about making the sprint-backlog even more transparent and automate a shout-out of what had been done in the sprint? 
featuredpost: false
featuredimage: /img/hawker.png
tags:
  - agile software development
  - azure
---
## 1. Introduction
Participants in the sprint review typically include the scrum team, management, customers, and developers from other projects (so basically anyone in the company + external people). Let me emphasize that **the review by the development team for the product owner and some kind of manager only is an antipattern**. This antipattern is so popular (at least I was there) that going out of this comfort zone (and antipattern) is hard because you used to review your work with the people you work with (doesn't this sound stupid?). But once you get out of the comfort zone, you won't ever want to go back.

#### 1.1 Keeping all those people informed...
Before each review how would you inform the people on what was achieved during the sprint? I have experienced 2 patterns;
- There is no information at all. Instead at the sprint review beginning, someone tells what was achieved and the agenda is formed. Often sprint backlog is adjusted during the review, to match the actual state. 
- Writing it by yourself each time. This is much better (as meeting without agenda is the greatest meeting sin), but it costs you time that from a lean perspective is a waste (a repeatable task that can be automated) and still often the sprint backlog is adjusted during the review to meet what was described.

Let me introduce the 3rd option. Automated sprint hawker!

## 2. What is sprint hawker anyway?
I was inspired by the name of the old newspaper selling boy - newspaper hawker (you must have seen one in the movies!):
![](/img/hawker.png)
The hawker used to shout about the most important news to all the people around. If someone was interested he went to the hawker to buy the newspaper. The sprint hawker also shouts about the sprint completed tasks and if someone is interested can join the review to know more. Everything you have to do is to finish the sprint (release new newspaper) and let the hawker shout!

How it can look like? Let's have a look at the sprint hawker (I had to withhold some information) I created using Azure logic app and slack:
![](/img/hawker1.png)

![](/img/hawker2.png)

No one has to do anything! It is a time-triggered action that reads data from a work item query. If you are not interested tn Azure DevOps + Slack implementation go to the last section to read the summary.

## 3. Sample implementation using Azure DevOps + Logic Apps and Slack. 
The setup is really easy and I am sure you can replicate the behavior using a different stack (Jira + AWS Step Functions, Azure functions, etc).

### 3.1 Writing the query
In Azure DevOps go to Boards -> Queries, then click the "Add query" button. The query to get the work items should be something as simple as this:
![](/img/azdev_query.png)
Remember to customize the columns (using "Column options" button in the edit), I have selected: `ID`, `Work Item Type`, `Title`, `Assigned To` columns. Save the query as shared queries, otherwise logic app won't be able to access the query.

### 3.2 Setting up the logic-app
Let's create a new logic app in the Azure portal. I will go with the designer - the logic app json is not something I am keen to write :) Let's go step by step.
1. First let's define the recurrence. For me it is each Friday at 11:00 UTC:
![](/img/hawker_app1.png)
2. Let's add "Get query results" step, select the query which you have defined in point 3.1:
![](/img/hawker_app2.png)
3. Now we are about to prepare the message. Let's introduce a variable, which will contain the message initial text:
![](/img/hawker_app3.png)
4. Now let's iterate over the query result and append to string variable necessary query result columns:
![](/img/hawker_app5.png)
5. Finally let's post the composed message to the slack public channel; To do this you will have to establish "API Connection". Don't worry - the Slack integration action makes it easy and the small wizard will help you to do that. 
![](/img/hawker_app6.png)
6. See the overview of the complete logic app flow: 
![](/img/hawker_app_all.png)

Done! Remember that you can always trigger the Logic App manually, make sure that the query returns something. Now you can copy the logic app json and prepare a proper arm template for repeatable infrastructure deployments.

## 4. People reactions and other conclusions
We were all worried before the first announcement (even after 2 or 3 test runs). The first two things that came to my and other team members minds was;
1. What if we will forget to update the sprint backlog? The hawker will write lies on the slack channel.
    * This didn't happen at all! What we've noticed is that we have been carrying more about the sprint backlog timeliness with the facts. That was the biggest win in my opinion - the transparency simply increased.
2. What if during the sprint we won't achieve anything? Then the hawker will try to sell an empty list.
    * This happened two times but we also noticed that the team also performs better in the review in such a situation. People started behaving more professionally - specific reasons are given, specific problems are marked instead of unnecessary justifications. In the end, the team worked hard, so if it turned out during the implementation of the task that for example, we could not get along with the external supplier or the data contract was broken by another team thus integration took more time or someone has to spend dozen-or-so hours in calls because of urgent issues, why should we treat it as a failure? It is primarily a place to learn and avoid a similar situation in the future. It is an important signal for the organization and other developers that something has to be fixed. The team simply turned failures into learning opportunities. I do not say that the sprint hawker did this, I say that the team grew up to this, and the hawker slightly supported this behavior. 

To sum up the team is delighted!

People outside of the team are also delighted. Everyone knows that every Friday at 1:00 PM (CET) there will be an announcement and reminder that in one hour we will start to review our work and show some new cool features! No one has to go to the sprint backlog - everything is listed right in the communication channel. Even is someone is ultra-busy he can quickly catch up when joining the meeting.

I think that you can play a little bit with your hawker. Some ideas:
* Custom message when nothing is delivered at the end of the sprint. Everyone will be rather taken over by this fact so I recommend something happy.
* Let the message contain notes and comments from the last review. Sometimes these are simple tasks that won't turn into user stories. By making this happen we will guarantee that every vote is taken seriously and won't get lost in the pile of all these other important stuff.
* Tell a random joke or interesting fact at the end of the announcement.

Note that the sprint hawker focuses on the "demo part" of the review and may prepare an agenda for the demo. Remember! A Demo is just a minor part of the review meeting.

