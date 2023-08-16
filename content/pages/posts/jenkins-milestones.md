---
title: Saving my company 66% of our Jenkins Agent Spend
excerpt: >- 
  How to implement a Jenkins CI/CD pipeline debouncer
date: '2023-08-15'
layout: post
---
### Problem
Jenkins is an open-source self-hosted solution for build automation, used by millions of developers. One thing that Jenkins 
_doesn't_ support out of the box, is a pipeline debouncer to ensure that if pull request checks are running at a 
given point in time, they are only running for the most recent version of the code.

Some reasons you might want to do this are if you're working on a project with expensive end-to-end tests
which run prior to merging code, for example, a very important piece of core platform infrastructure. You might push a 
couple commits separately in an hour, each triggering a Jenkins pipeline via GitHub push webhook. These Jenkins pipeline might
take hours to run on expensive infrastructure, because they require spinning up a complete copy of your company's application 
stack and test data. 

Jenkins, by default, allows concurrent pipelines to run, and simply disabling concurrent builds will still have all your
CI/CD checks queue up in order. But there's rarely a reason to keep tests running which exercise non-current code. Aborting
these old builds after a new one starts can save you money! Across the company, implementing this solution saved us ~$5000/month 

### Solution:
Jenkins provides Milestones through the [Pipeline: Milestone Step](https://plugins.jenkins.io/pipeline-milestone-step/),
which might already be installed on your server.

Milestones are primarily intended to prevent older builds from overwriting newer ones. For example, if your pipeline
automatically deploys changes, you wouldn't want an old deployment to override a new one, or older builds to overwrite
:latest in a container or package registry.

However, you can also use milestones in our CI/CD pipelines, where you don't care about test results for your branch
from 5 commits ago. Slightly modifying [an example](https://issues.jenkins.io/browse/JENKINS-43353?focusedId=365375&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#comment-365375)
from Brandon Squizzato, we end up with the following, which we can place at the beginning of our Jenkinsfile:

```groovy
def intBuildNumber = $BUILD_NUMBER.toInteger()
if (intBuildNumber > 1) milestone(intBuildNumber - 1)
milestone(buildNumber)
. . . rest of your pipeline goes below . . .
```

#### Explanation
On the very first build for a branch, we'll create a milestone for the build number (1).
On the nth run, we'll create a milestone for the nth build, as well as n-1. The nth milestone is used so the currently-running
build can be aborted by future builds, and the n-1 milestone aborts the previous build once it's reached.

Normally, you'd pass a milestone after you actually accomplished something, like uploading a binary. But when the output
of the pipeline is only pass/fail results for the stages, you can pass the milestone immediately.

Note that milestones are branch-specific, so you don't have to worry about your build #7 aborting build #3 on someone
else's branch.

### Conclusion
Putting it all together, this gets us to our goal of aborting previous CI/CD builds for a particular branch on a new push,
