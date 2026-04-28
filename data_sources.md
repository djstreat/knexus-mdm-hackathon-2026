# Notes on data sources:



### potential data sources:

[federal fleet open data set](https://www.gsa.gov/policy-regulations/policy/motor-vehicle-management-policy/federal-fleet-report-ffr)
- (inventory, cost, utilization, fuel consumption - data on these four areas) costs per mile; fuel costs and consumption - lots of high-level data but more totals and perhaps not granular enough

[city of austin ems](https://data.austintexas.gov/Public-Safety/EMS-Fleet-Maintenance/5nys-nsyc/about_data)
- 11 columns ; unsure how useful this can be by itself
- see also: (https://catalog.data.gov/dataset/ems-fleet-maintenance)

[Cincinnati Fleet](https://data.cincinnati-oh.gov/Thriving-Neighborhoods/Fleet-Preventative-Maintenance-Repair-Work-Orders/2a8x-bxjm/about_data)
- more metadata than above

[https://researchdata.se/en/catalogue/dataset/2024-34/2](https://arxiv.org/pdf/2401.15199)
- scandia truck dataset

### alternate:

- https://github.com/search?q=fleet+maintenance&type=repositories&p=1
- https://github.com/snehamitta/Predictive_Maintenance_Optimization/blob/master/fleet_train.csv (where did this dataset come from? ask an an llm or seach for it)
- https://www.transit.dot.gov/ntd/data-product/2022-annual-database-vehicle-maintenance (anything else available here?)
<!--- https://metrics.mta.info/?home/ (some data on bus failures but not much else?)-->


### disclaimers re: the data and assumptions being made
- we know the data has been obfusacated, but we see counts assicoated with certain defect codes.  we will assume that these counts are 'correct'
- implications of this in terms of the fidelity of the data?
-

## notes on gscc data dictionary:

#### id's and due dates:

-SR_NUMBER - identiefier for service request - unique
-NSN_ORDERED - national stock number
-- first four - FSC - next 9 - NIIN
- NIIN - NIIN
- RDD - date or code that denotes when a material is required to support ops
- FY_QTR - fiscay year and qtr when the original document was established via the status received date
- FY_MTH - fisxy year month the doc was created
- MAX_STAT_DT - max status receive date

#### locations:
- SUPP_ADD - final destination/receiving unit


#### orders, and quantities:
- BO_QTY_FIRST - backordered first time
- REMAIN_DUE - after events, the amt still required
- BO_QTY_LAT - "" but lats time it was BO
- QTY_SHIPPED - qty based on doc identifier code of item shipped
- several receipt/ship w/ code prefix (e.g. DRB_QTY, DRF_QTY) where DRB and DRF and codes
- FILLED_BY - indicates the SOS who fills the requisition, can be more than one
- RDD_DAYS_FROM_TODAY = reprsents the number of days from 
- various other RDD type fields

#### Comments from Michael:
'low density, high demand' - you only have so many

- services requests are unique
- there should only be 1 service request per incident
- there can be multiple service requests per item of record
- TAMCN - 'the jeep' 'the toyota truck'
- Serial # - the actual vin/item number
- location/ time data is available on a related table
-
