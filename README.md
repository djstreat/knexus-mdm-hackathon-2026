# Annomaly detection for predictive maintenance

## Project purpose:

The primary mission of this initiative is the deployment of an advanced diagnostic layer designed to identify and mitigate irregularities across financial, maintenance, and supply chain data streams.  By implementing sophisticated machine learning models, the tool aims to ehnance operational readiness and fiscal responsibility.  The system architecture focuses on identifying significant cost outliers, widespread equipment malfunctions, and throughput bottlenecks.  This apporoach equips supply chain analysts with useful insights to maintain data accuracy and improve the allocation resources.

Anomalay detection taxonomy and methodology:

1. Financial and pricing anomalies
-- The system establishes dynamic baslines for unit costs. The process calculates a moving average of unit costs for each NSN.  A records is flagged for catalog review if its cost exceeds a 5-sigma deviation from the historical mean or a fixed ceiling of 1,000,000 dollars.
2. End-item maintenance burdens
-- The tool identifies systemic failures in specific equipment types (TAMCN) by correlating parts charges with service records.  The model identifes end-items that impose a disproportionate maintenance burden through high-frequency failure signatures.
3. Severe supply chain bottlenecks
-- Utilizes time-series analysis to detect paralysis in the supply chain.  By monitoring customer wait time (CWT) and fulfillment health, NSN that transition from delayed to non-functional are flagged.
4. Order pattern and behavioral anomalies
-- Identifies pattern deviations through ratio analysis (quantity per service request).  Any request with a quantity-to-sr ratio that exceeds the 95th percentile of historical averages identifies bulk hoarding behavior.
5. Systemic data quality issues
-- Filters and flags recurring technical fialurre int eh date calculation logic of the source system.  The due_in table contains a flaw where RDD logic failes during Julian date and nex-year rollovers.


## Data source:

- The field "SR_NUMBER" is used to join tables
- Data is hashed for privacy.  Although we seek to understand relations and nuances in the data, we do not seek to deanonymize the data.

- Table 1: hashed_header. Contains GCSS-MC service request header information (gcss-mc/raw-source/hashed_header.csv). 
- Table 2: hashed_sr_parts. Contains information about repair parts associated with service requests in hashed_header table (gcss-mc/raw-source/hashed_sr_parts.csv). 
- Table 3: hashed_due_in: Contains requisition information associated with service requests and repair parts featured in the other two tables. (gcss-mc/raw-sources/hashed_due_in.csv)

There is a data dictionary for each csv stored as a csv with a similar name that includes a '_dict' suffix.  An expert-level user of the system notes the following observations. Note this list is not exhaustive as there are many oddities in this dataset:

- Take into account items oreder on the same day may have multiple parts such as tirese.  Is there any time gap in ordering the part.  This could allude to a faulty part or bad troubleshooting.
- Look for spikes in ordering the same part by fiscal year and/or quarter.
- Document number is hashed, but consists of unit-julian date-sequence number and the relationships, although hashed, would still be maintained.
- GROUP NSN by SOS

The files 'rnsn_labels.csv' and 'ramcn_lables.csv' are machine generated in a separate process from the data above and are useful in explainability but should be ommited from the initial analysis.
