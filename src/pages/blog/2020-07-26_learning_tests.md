---
templateKey: blog-post
title: >-
  The underestimated learning tests
date: 2020-07-26T21:00:00.000Z
description: >-
  How do you approach integration with 3rd party services? How do you learn new API which you have to use? Do you write a console app, run and stop it over and over again? If you write a service that will be used by others do you write documentation? Stop wasting time! Learning tests will help you speed up.
featuredpost: false
featuredimage: /img/learning_tests.png
tags:
  - agile software development
  - craftsmanship
---
## 1. Introduction
The idea of learning tests is old - I have read about it for the first time in Clean Code by Robert C. Martin, they are also mentioned by Kent Beck in his TDD by example book. Quite an important classics aren't they? The chapter with learning tests is very short but don't get it wrong it doesn't mean that this idea is not important it is just easy to explain. I needed a few years to start writing them, the funny thing is that once I started doing it, I cannot stop it! And I will tell you why.

## 2. What are these tests? Why do you think they are so precious?
Learning tests provide a convenient mechanism for exploring an API in an isolated, incremental, and reproducible way. They also provide a demonstrably accurate form of documentation for future reference. Let's define some advantages that they bring:

* They cost nothing! All in all, you will have to spend time learning a particular library/framework. This point I took from the Clean Code book [1], [2].
* They are an investment - when a new version of external dependency is released we run learning tests and we check if there are some differences. This again comes from the Clean Code book [1], [2].
* You create knowledge - the tests will be in source control, everyone in the organization can learn from them. In other words, you reduce the bus-factor.
* You gain hands-on experience very fast when compared to stop and run an app over and over again.
* The hands-on experience helps you to give more precise estimations for the upcoming tasks. This is an ideal "expected result" to be contained in spikes as part of the Definition of Done. If you don't know what are spikes make sure to check Mick Cohn blog about it [4].

To be honest, I don't see any cons. This is extremely rare in IT but this is the reason why I decided to write a post about it. I also believe that this approach brings some science to software engineering. According to Mary & Tom Poppendeick [3] the scientific method looks like this:
1. Observe and describe a phenomenon or group of phenomena.
2. Formulate a hypothesis to explain the phenomena.
3. Use the hypothesis to predict something the existence of other phenomena or the results of new observations.
4. Perform experiments to see if the predictions hold up.
5. If the experiments bear out the hypothesis it may be regarded as a theory or rule.
6. If the experiments do not bear out the hypothesis, it must be rejected or modified.

Let's stay a bit more with Lean - In the same book [3] we can read that every Toyota worker is taught to use basic problem-solving techniques as the primary approach to doing their job. Toyota workers operate as a community of scientists, conducting ongoing experiments, constantly learning, and codifying new knowledge for the future. Learning tests can be the code that codifies that knowledge, and can be a tool that can help you conduct the experiments, your teammates can be the community of scientists. 

Having in mind the mentioned scientific method we can easily test some assumptions, fail fast, and even keep the tests when our assumptions failed to document the failed experiment. Or... if we choose to conduct few experiments against a hypothesis and all of them were successful we still can decide to keep all of them to document our actions. As an example, my team came into the hypothesis that message-based, loosely-coupled asynchronous communication will help our project in numerous ways. We did some experiments using a learning test with MassTransit and Rebus. We decided to use MassTransit but we still have Rebus Learning Tests in source control.

## 3. Should this be part of CI?

I am not sure, at the moment I have them skipped - as there is no strict relation between my project code and these tests. I just want to have them in source control as they help me to create the relevant code and most likely they will help me to evolve this code or can prove to be useful in other projects. So there will be a place a can look back into. 

On the other hand, I am more and more convinced to put them as a part of the CI process but make the step optional. This way we can be sure that the knowledge in which learning tests document is reliable, but if something goes wrong I am still able to publish a new version of my app and look into the tests to see what changed, fix them and possibly make the knowledge again reliable.

## 4. Ok cool... but can you give me some real examples?
Sure thing! These are in C# and F# but this is not that important. So:
1. We were asked to integrate with other system created by another team via event they publish. It was our first integration with them and we knew that they were using Cloud Events standard to publish them which we did not know. That is why we have informed our product owner that we may better do a spike first. The learning test looks like this:

```csharp
[Fact]
public async Task Given_CompanyreatedEvent_When_EventIsReceived_Then_ItIsPrintedToDebugOutput()
{
    // Arrange
    var waitForNewCompany = new TaskCompletionSource<CompanyCreated>();
    var contentType = "application/json";
    var busControl = Bus.Factory.CreateUsingAzureServiceBus(cfg =>
    {
        cfg.Host(ServiceBusUri);
        cfg.SubscriptionEndpoint(
            subscriptionName: "invoicing*",
            topicPath: "companyCreated",
            e =>
            {
                e.AddMessageDeserializer(new ContentType(contentType),
                    () => new CustomMessageDeserializer(contentType));
                e.Consumer(() => new TestConsumer(waitForNewCompany));
            });
    });
    // Act
    await busControl.StartAsync();
    var createdCompany = await waitForNewCompany.Task;
    // Assert
    Debug.Write(JsonConvert.SerializeObject(createdCompany));
    Assert.NotNull(createdCompany);
}
```

We have learned that we have to write custom deserializer to fetch cloud events with mass transit that would handle the cloud event message envelope. This took some time which was addressed by the spike planned effort.

2. We were asked to integrate with Salesforce to invoice some stuff that our salespeople were putting there. Again we conducted a spike with a series of experiments to verify if we can get the data we need:

```fsharp

[<Fact(Skip = "Salesforce learning")>]
let ``Retrieve Saleforce access token`` () =
    let token =
        Http.RequestString("https://ihavetomakethissecret.salesforce.com/services/oauth2/token",
            body = FormValues [
                "grant_type", "password";
                "client_id", "ihavetomakethissecret"
                "client_secret", "ihavetomakethissecret"
                "username", "ihavetomakethissecret"
                "password", "ihavetomakethissecret"
                ]) |> Json.deserialize<SalesforceToken>
    token.access_token |> should not' (be Empty)
    token

[<Fact(Skip = "Salesforce learning")>]
let ``Get list of objects`` () =
    let token = ``Retrieve Saleforce access token``().access_token |> sprintf "Bearer %s"
    let response =
        Http.RequestString("https://ihavetomakethissecret.salesforce.com/services/data/v42.0/sobjects", httpMethod = "GET",
            headers = ["Authorization", token; "X-PrettyPrint", "1"])
    response |> should not' (be Empty)

[<Fact(Skip = "Salesforce learning")>]
let ``Examine accounts schema, list accounts relavant data`` () =
    let token = ``Retrieve Saleforce access token``().access_token |> sprintf "Bearer %s"
    let describeAccountResponse =
        Http.RequestString("https://ihavetomakethissecret.salesforce.com/services/data/v20.0/sobjects/Account/describe", httpMethod = "GET",
            headers = ["Authorization", token; "X-PrettyPrint", "1"])
    let soqlAccountResponse =
        Http.RequestString("https://ihavetomakethissecret.salesforce.com/services/data/v20.0/query", httpMethod = "GET",
            headers = ["Authorization", token; "X-PrettyPrint", "1"], query = ["q", "SELECT Id, Name, BillingCountry, BillingCity FROM Account WHERE Name LIKE 'Mercedes Germany'"])
    describeAccountResponse |> should not' (be Empty)
    soqlAccountResponse |> should not' (be Empty)

[<Fact(Skip = "Salesforce learning")>]
let ``Examine contracts schema, list contracts relavant data`` () =
    let token = ``Retrieve Saleforce access token``().access_token |> sprintf "Bearer %s"
    let contractInfoResponse =
        Http.RequestString("https://ihavetomakethissecret.salesforce.com/services/data/v20.0/sobjects/Contract__c/describe", httpMethod = "GET",
            headers = ["Authorization", token; "X-PrettyPrint", "1"]) |> Json.deserialize<Root>
    let columnsNames = contractInfoResponse.fields |> Seq.map(fun item -> item.name)
    let soqlContractsResponse =
        Http.RequestString("https://ihavetomakethissecret.salesforce.com/services/data/v20.0/query", httpMethod = "GET",
            headers = ["Authorization", token; "X-PrettyPrint", "1"], query = ["q", "SELECT Id, Name, Initial_Subscription_date__c, Next_Invoice_Date__c, Number_of_paying_users__c, Number_of_Paying_Users__c FROM Contract__c" ])
    columnsNames |> Seq.length |> should be (greaterThan 0)
    soqlContractsResponse |> should not' (be Empty)
```
We have learned a lot. Instead of blind-estimate in the form of "we will do this in X days", we planned a spike with planned hours we want to "pay" to get the right knowledge. After we spent X days we've created a user story to implement the actual feature. We didn't make it but we have made it 2 days later. In this complexity, the business people were all in all more than happy! Without these tests, we would fail severely. Before we wrote the true code in the learning tests I've also written this comment;
```csharp
// 1. Connected app must be created in app manager https://ihavetokeepitsecret.lightning.force.com/lightning/setup/NavigationMenus/home
// 1a. Checkbox Enable O-Auth Settings Must be selected
// 1b. Select proper scope, I selected full-access.
// 2. Find your connected app on the apps list in app manager
// 3. From the right down-arrow select Manage
// 4. Click edit policies
// 5. For "Permitted Users" select "Allow all users to self-authorize"
// 6. Go back to the list of apps. Now from the down-arrow select view
// 7. Get the consumer key and consumer secret.
// 8. Test the connection with curl:
// curl https://iahvetokeepitsecret.salesforce.com/services/oauth2/token -d "grant_type=password" -d "client_id=[consumerKey]" -d "client_secret=[consumerSecret]" -d "username=[userName]" -d "password=[Password]"
// 9. Enjoy the token. Refer to the app if you want to check some settings.
```

I hope you get the idea.

## 5. Summary
The learning tests prove to be a very useful tool many times for me. I am wondering why they are so rare? I mean I haven't seen them anywhere! Did you? I hope I got you inspired and next time when you will have to integrate with the next service you will do a spike with a learning test as a spike effect. It will help you to provide a good estimation of actual tasks and shine within the company when someone will ask... 
> Hey! Did someone already integrate with service X? Can someone help me?

Boom! 
> Sure! Please have a look at this test. Here's everything you need.

This happen to me when I was to integrate with Salesforce. Not only that! Also, you can use it to play with libraries you didn't know. This tests will help you to get acquainted with many aspects in an extra short time compared with other 

#### 5.1 Some opinions from my teammates
I have asked my teammates about learning tests. The question was more or less:
> What do you think about learning tests? I think you didn't code them before right? Can you give me a few sentences of your opinion?

> So I think that learning tests are very useful. Before I didn't see its value but now I see that this technique just makes things easier and opens sometimes my eyes on the hard things. Especially once you wrote some of them in the project, I understood the sense of it - Ania.

> For me, learning tests are a brilliant thing because (by definition) they allow you to learn a specific mechanics, and the test itself reduces the amount of effort that needs to be spent to learn the mechanics logic. Plus, they work a bit like a sandbox: you can play and break until you learn all the behaviors. The mere fact of having them in the project is beneficial because, for example: salesforce was already working at the accept and sandbox level, but it just failed on production. So I took the learning tests, changed the parameters, and identified the production problems in minutes - Maciek.

 > No, I didn't know this concept before. Cool thing if you want to know something. Although No. I've used this concept but I didn't use this name - Marcin.

 The last one is rather stingy said but note that all of my teammates say that this is cool stuff !!! Give it a try, you won't regret it.
 
- - -
<small>
<b>Footnotes:</b><br/>
[1] This is my free translation basing on Polish version of the book.<br/>
<b>References:</b><br/>
Books:<br/>

[2] *Clean Code: A Handbook of Agile Software Craftsmanship* by Robert C. Martin.<br/>
[3] *Implementing Lean Software Development From Concept to Cash* by Mary & Tom Poppendeick.<br/>

Websites: <br/>

[4] [Mike Cohn about spikes on Mountain Goat Software blog](https://www.mountaingoatsoftware.com/blog/spikes) <br/>

