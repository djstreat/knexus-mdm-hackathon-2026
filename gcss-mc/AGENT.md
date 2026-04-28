# MDM 2026 Hackathon

The following directory has a folder, `raw-source`, contains an anonymized data for use with a hackathon challenge, however,it is only available as a schema-less CSV dump.

Using your available tools and expertise, assist in the hackathon effort by reading the files and their data-dicts - which define in natural language each row in the dataset - and develop a repeatable script that will load the full dataset (consisting of three tables, one for each csv) into a SQLite3 database. SQLite3 is on the host system.

## Schemas

1. Precise schemas for the dataset are unknown and must be inferred. The source information is in Excel format, so some columns containing data such as dates will likely need translation in order to be interpreted accurately in the destination SQLite3.

2. The data has been anonymized, so some of the codes and precise fields may not be exactly as described. For example, you may find that the national stock number is not in the data, only a hash. Where a precise data type has been replaced by a hash, please use the VARCHAR data type to house this column.

## Notes

Each file has an accompanying "Data Dict" which help in understanding, but are not part of the end data set. However, on close examination it appears that the anonymization process has rendered several of the columns as hashes and other opaque strings, making the precise schema definition unreliable. We need to solve enough of this problem in order to load the files into a queryable database format.

## Tactics

Preprocessing any data inconsistencies may be done with a short (try to stay under 50 LOC) script in either Javascript (Node.js 24 is installed on the host) or Python (Python3.12 is available as `python3` on the host). **Do not install or reference any external packages if this is to be the approach**. Only use the default language runtime / builtins.

The data load process must be repeatable, i.e. a clean state containing only the CSV files and the output script(s) should result in the same Sqlite database every time. Ensure this is the case.

