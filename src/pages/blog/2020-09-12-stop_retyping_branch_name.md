---
templateKey: blog-post
title: >-
  Stop retyping your branch name when you push to origin
date: 2020-09-12T20:00:00.000Z
description: >-
  Just stop 🤬 There is a better way of doing it! Fire one command and spare few seconds multiplied by a hundred times. Welcome to my shortest post on this blog.
featuredpost: false
featuredimage: /img/git.png
tags:
  - git
---
## 1. The problem and the solution
So after a few years of creating new branches and pushing them to the origin, I realized that I am doing a strange thing **each time**. Let's begin the simulation.
1. Create the branch locally.
2. Do some changes, commit them.
3. Time to push the changes:
```bash
$ git push
fatal: The current branch feature/a_branch has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin feature/a_branch
```

4. Copy the output command, paste it, execute again or retype with a shortcut: `git push -u origin feature/a_branch`
5. Done

Point 4 is just stupid, isn't it? Luckily according to git docs [1] we have a nice setting named `push.default` which we can set to `current`:
> Push the current branch to update a branch with the same name on the receiving end. Works in both central and non-central workflows.

It is enough to run this command:
```bash
git config --global push.default current
```

To set automatic tracking (so You can pull changes from the origin) run this:
```bash
git config --global push.autoSetupRemote true
```

Done. Years of copy & pasting the output command are gone. You might want to see if the configuration is correct using
```bash
git config --global --list
```

Last thing to remember: If You want to pull from the remote later on, you still have to push the branch and set the tracking. But `-u` is everything you need here. So when you push for the first time use;
```bash
git push -u
```

You can of course apply this setting only to the selected repository. In this case, your working directory should be your repository and you should omit the `--global` argument. Cheers!

## 2. Conclusions
It is always worth to challenge your routine habits. The second conclusion is that it is worth to get know the tools you use 😅.

- - -
<b>References:</b><br/>
Websites: <br/>

[1] [Git configuration documentation](https://git-scm.com/docs/git-config) <br/>

