---
templateKey: blog-post
title: >-
  Outbox pattern in F#
date: 2021-02-01T19:35:00.000Z
description: >-
  If you are implementing more than one service and you need to establish asynchronous communication in-between, or if you need bullet-proof asynchronous communication with 3rd party services the outbox pattern might be a handy tool. Let's look how can we implement one in the beloved F#!
featuredpost: true
featuredimage: /img/outbox.svg
tags:
  - 'F#'
  - Patterns
---
## 1. Introduction

![](/img/outbox/outbox1.png)
![](/img/outbox/outbox2.png)
![](/img/outbox/outbox3.png)
![](/img/outbox/outbox4.png)


- - -
<b>References:</b><br/>
Websites: <br/>

[1] [*Dependency Injection Principles, Practices, and Patterns* by Mark Seeman](https://www.goodreads.com/book/show/