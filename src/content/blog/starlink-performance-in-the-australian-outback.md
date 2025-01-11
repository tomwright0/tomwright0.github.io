---
author: Tom
pubDatetime: 2025-01-11T12:48:00Z
title: Starlink Performance in the Austrlian Outback
slug: starlink-performance-in-the-australian-outback
featured: false
draft: false
tags:
  - internet
  - networking
  - starlink
description:
  My Starlink performance metrics and writeup
---

We've recently moved to Roxby Downs, South Australia and with the move, we decided to bite the bullet on Starlink.
<br> <br>
Previously on a Roam - Unlimited plan in our old location due to being at capacity and our old Telstra Smart Modem Gen 3 just stopping working in early December while on a trip to Melbourne.
<br> <br>
Since moving over to the Residential plan in the new area, I have observed much better speeds, less congestion during peak times and due to the location not being in the middle of WA, much better gaming pings to Sydney based servers, which is where most are hosted.

![mySpeed last 7 days](@assets/images/mySpeed-last-7-days.png)*Last 7 days of network speed tests running hourly via a program called [MySpeed](https://github.com/gnmyt/myspeed), hosted on an LXC container in Proxmox*


As you can see above, this is a much better experience than 25/5 FTTN, which we moved from. Both of the minimums well surpass the usual old results.

Updates and downloads are lightning fast, gone are the days of waiting 15 hours for the latest Call of Duty update, while simultaneously causing the entire network to halt due to bufferbloat. As well as updates, 4K streaming is an absolute breeze, streaming from my Melbourne-based Plex server has caused no dramas.

On top of hourly speedtests, I also run [SmokePing](https://oss.oetiker.ch/smokeping/index.en.html), a network latency monitoring tool that visualizes packet loss, latency, and jitter using graphs over time.

![smokeping graphs for Last 30 Hours to AWS Melbourne and Sydney](@assets/images/smokepings.png)*Last 30 hours of pings every 5 minutes to both AWS Melbourne and Sydney, notice that the ping is lower to Sydney due the Starlink PoP being located there*


Again, the performance is within expectation and if not better than what you'd typically get from a satelite service. At a previous job, I was doing technical support over the phone for an NBN satelite service, which had above 600 ping!

All in all, I would recommend anyone who is on a terrible FTTN or Fixed Wireless service to steer clear from NBN and sign up to Starlink ASAP. 
<br>You will not regret it.