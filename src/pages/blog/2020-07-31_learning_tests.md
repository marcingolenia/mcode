---
templateKey: blog-post
title: >-
  The underestimated learning tests
date: 2020-07-31T18:41:11.000Z
description: >-
  How do you approach integration with 3rd party services? How do you learn new API which you have to use? Do you write a console app, run and stop it over and over again? If you write a service which will be used by others do you write documentation? Stop wasting time! Learning tests will help you speed up.
featuredpost: true
featuredimage: /img/learning_tests.png
tags:
  - agile software development
  - craftsmanship
---
## 1. Introduction
The idea of learning tests is old - I have read about it for the first time in Clean Code by Robert C. Martin. Quite an important classic book isn't it? The chapter with learning tests is very short but don't get it wrong it doesn't mean that this idea is not important it is just easy to explain. I needed a few years to start writing them, the funny thing is that once I started doing it, I cannot stop it! And I will tell you why.

## 2. What are these tests? Why do you think they are so precious?

* They cost nothing! All in all, you will have to spend time learning a particular library/framework.
* You create knowledge - the tests will be in source control, everyone in the organization can learn from them. In other words you reduce bus-factor.
* You gain hands-on experience very fast when compared to stop and run an app over and over again.
* The hands-on experience helps you to give more precise estimations for the upcoming tasks.


To be honest, having in mind the first post of pros I don't see any cons. This is extremely rare in IT but this is the reason why I decided to write a post about it.

## 3. Should this be part of CI?

I don't think so. I have them skipped - as there is no strict relation between my project code and these tests. I just want to have them in source control as they help me to create the relevant code and most likely they will help me to evolve this code or can prove to be useful in other projects. So there will be a place a can look back into.

## 4. Ok cool... but can you give me some real examples?
Sure thing! 

## 5. Summary
The learning tests prove to be a very useful tool many times for me. I am wondering why they are so rare? I mean I haven't seen them anywhere! Did you? I hope so. I hope I got you inspired and next time when you will have to integrate with the next service you will do a spike with a learning test as a spike effect. It will help you to provide the good estimation to actual tasks and shine within the company when someone will ask... 
> Hey! Did someone already integrate with service X? Can someone help me?

Boom! 
> Sure! Please have a look at this test. Here's everything you need.

Not only that! Also, you can use it to play with libraries you didn't know. This tests will help you to get acquainted with many aspects in an extra short time compared with other 

#### 5.1 Some opinions from my teammates
I have asked my teammates about learning tests. The question was more or less:
> What do you think about learning tests? I think you didn't code them before right? Can you give me a few sentences of your opinion?

> So I think that learning tests are very useful. Before I didn't see its value but now I see that this technique just makes things easier and opens sometimes my eyes on the hard things. Especially once you wrote some of them in the project, I understood the sense of it - Ania.

> For me, learning tests are a brilliant thing because (by definition) they allow you to learn a specific mechanics, and the test itself reduces the amount of effort that needs to be spent to learn the mechanics logic. Plus, they work a bit like a sandbox: you can play and break until you learn all the behaviors. The mere fact of having them in the project is beneficial because, for example: salesforce was already working at the accept and sandbox level, but it just failed on production. So I took the learning tests, changed the parameters, and identified the production problems in minutes - Maciek.

 > No, I didn't know this concept before. Cool thing if you want to know something. Although No. I've used this concept but I didn't use this name - Marcin.

 The last one is rather stingy said but note that all of my teammates says that this is really cool stuff !!! Give it a try, you won't regret it.
 
- - -
<small>
<b>Footnotes:</b><br/>
[1] This is my free translation basing on Polish version of the book.<br/>
<b>References:</b><br/>
Books:<br/>

[1] *Clean Code: A Handbook of Agile Software Craftsmanship* by Robert C. Martin.<br/>
