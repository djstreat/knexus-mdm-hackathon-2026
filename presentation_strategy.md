1. explain the problem (don't assume familiarity)
"We used the GCSS - systems of record dataset for repair requests.
2. present the solution to the problem and explain why it's useul

3. 'here's our approach to addressing this (one of five target issue areas):

- explain methodology


GSCC Maintenance Oracle:

Good afternoon everyone!  I'm here with Mike MAR-FOR-RES My name is Adam and this is my colleage Kevin, we're from Knexus reasearch

[the problem]
Consider a marine in the field currently repairing, lets say an axle on a Jeep.  

The same axle repaired on the same Jeep three times already in the past three months.  

Unfortunatley, the reality is there are other marines repairing the same part, on the same type of vehicle.  This reduncancy isn't necessarily made aware to the logisitics analysts responsible for continued mission support.

[the solution]

Using the existing GCSS dataset (for anyone who's not familiar, this is the primary systems of records for service requests at the marines), our system is able to automatically detect irregularities ~~in the data~~; chronic issues and patterns of failure in the supply chain, streamlining the detection process - saving analysts' time and resources, leading to substantial synergies.  

Think OODA Loop:  Our AI agent automates the first two (observe, orient), providing an analyst with auditable insights, allowing them to focuses on decisions and actions.

The orcale has five main focus areas:

- financial errors
- maintenance burdens
- supply bottlenecks
- order patterns
- data quality

[now i'll hand it over to my colleage who will walk you through a failure flagged in one of our focus areas as well as explianing how it's been identified]

Now we'll take a look at a situation where concentrated subsystem failures lead to unusually high maintenenace burden.

Here our system flags a TAMCN that is detected across 5K service requests for a total of 10 million dollars..Our system flags these automously..

Here's a situation where a part found within another machine is constantly failing, causing the primary machine to be out of service.  These situaitons are not immediately clear without performing pattern analysis and anomaly detection.

[heres how we did it]

Kevin goes over the UI here

[final thoughts/value add]

Mike

[thank you]
In addition to our teammate Michael Fermin, we'd like to thank Tiffany Heppard for her invaluable input as a SME and our mentor, David Saunders



## feedback/ notes from Justin:

now that you have some examples, articulate how we'll go about actually solving these issues at scale via the following implementation:



# potential questions:

q: how do you know the thing doesnt just cost 11M and that's normal?
a: our system doesn't make strong assumptions about why something occured, just that it has occured and warrants attention and or investigation