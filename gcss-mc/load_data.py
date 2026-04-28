import csv
import sqlite3
import datetime
import re
import os
import traceback

def parse_date(val):
    if not val or val.lower() == 'null' or val.strip() == '':
        return None
    val = val.strip()
    # Common formats in the datasets
    formats = [
        '%d-%b-%y',             # 27-JAN-24
        '%m/%d/%Y %I:%M %p',    # 3/31/2020 6:10 PM
        '%m/%d/%Y %H:%M',       # 3/31/2020 18:10
        '%m/%d/%y %I:%M %p',    # 3/31/20 6:10 PM
        '%Y-%m-%d %H:%M:%S',    # ISO
        '%Y-%m-%d',             # ISO Date
        '%m/%d/%Y',             # 3/31/2020
        '%d-%b-%Y',             # 27-JAN-2024
        '%m/%d/%y',             # 3/31/20
    ]
    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(val, fmt)
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
    return val

def get_dict_info(dict_path):
    """Returns a dict mapping column name to its type/info."""
    info = {}
    if not os.path.exists(dict_path):
        print(f"Warning: Dict file {dict_path} not found.")
        return info
    with open(dict_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if not fieldnames:
            return info
        
        first_field = fieldnames[0].strip().lower()
        if first_field == 'column': # due_in_data_dict style
            for row in reader:
                col = row['Column'].strip().upper()
                info[col] = {'comment': row.get('Comment', '')}
        else: # others have COLUMN_NAME
            for row in reader:
                col = row.get('COLUMN_NAME', '').strip().upper()
                if col:
                    info[col] = {
                        'type': row.get('DATA_TYPE', '').upper(),
                        'nullable': row.get('NULLABLE', '').strip().upper() == 'YES',
                        'comment': row.get('COMMENTS', '')
                    }
    return info

def load(csv_path, dict_path, table_name, db_conn):
    dict_info = get_dict_info(dict_path)
    print(f"Loading {csv_path} into {table_name}...")
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file {csv_path} not found.")
        return

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if not fieldnames:
            print(f"Warning: {csv_path} is empty or has no headers.")
            return

        # Determine columns and types for SQLite creation
        sql_cols = []
        col_types = {} # column name -> type string (TEXT, REAL)

        for col in fieldnames:
            col_stripped = col.strip()
            col_upper = col_stripped.upper()
            ctype = 'TEXT' 
            
            # Check dict for hint
            if col_upper in dict_info:
                d = dict_info[col_upper]
                if 'type' in d:
                    dt = d['type']
                    if 'NUMBER' in dt:
                        ctype = 'REAL'
                    elif 'DATE' in dt or 'TIMESTAMP' in dt:
                        ctype = 'TEXT' # SQLite stores dates as strings
                    else:
                        ctype = 'TEXT'
            
            col_types[col_stripped] = ctype
            sql_cols.append(f'"{col_stripped}" {ctype}')

        db_conn.execute(f"DROP TABLE IF EXISTS {table_name}")
        db_conn.execute(f"CREATE TABLE {table_name} ({', '.join(sql_cols)})")

        placeholders = ', '.join(['?' for _ in fieldnames])
        insert_sql = f"INSERT INTO {table_name} VALUES ({placeholders})"

        count = 0
        for row in reader:
            vals = []
            for col in fieldnames:
                col_stripped = col.strip()
                val = row[col].strip()
                if val.lower() == 'null' or val == '':
                    vals.append(None)
                else:
                    # Use dict info to decide if it should be parsed as date
                    col_upper = col_stripped.upper()
                    is_date = False
                    if col_upper in dict_info and 'type' in dict_info[col_upper]:
                        dt_type = dict_info[col_upper]['type'].upper()
                        if 'DATE' in dt_type or 'TIMESTAMP' in dt_type:
                            is_date = True
                    elif any(kw in col_upper for kw in ['DATE', 'DT', 'DTTM']):
                        is_date = True
                    
                    if is_date:
                        parsed = parse_date(val)
                        vals.append(parsed)
                    elif col_types[col_stripped] == 'REAL':
                        try:
                            # Try to convert to float, if it fails (e.g. hash), keep as string
                            vals.append(float(val))
                        except ValueError:
                            vals.append(val)
                    else:
                        vals.append(val)
            db_conn.execute(insert_sql, vals)
            count += 1
        print(f"Successfully loaded {count} rows.")

def main():
    db_path = 'hackathon_data.sqlite3'
    if os.path.exists(db_path):
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path)
    
    tasks = [
        ('raw-source/hashed_due_in.csv', 'raw-source/due_in_data_dict.csv', 'due_in'),
        ('raw-source/hashed_header.csv', 'raw-source/sr_header_dict.csv', 'sr_header'),
        ('raw-source/hashed_sr_parts.csv', 'raw-source/sr_repair_part_dict.csv', 'sr_parts')
    ]

    for csv_f, dict_f, table in tasks:
        try:
            load(csv_f, dict_f, table, conn)
        except Exception as e:
            print(f"Error loading {csv_f}: {e}")
            traceback.print_exc()

    conn.commit()
    conn.close()
    print(f"\nDatabase created: {db_path}")

if __name__ == "__main__":
    main()
