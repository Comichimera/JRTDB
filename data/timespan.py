import pandas as pd
from datetime import timedelta

# Load datasets
records_df = pd.read_csv('records.csv')
players_df = pd.read_csv('players.csv')

# Merge records with player names
merged_df = records_df.merge(players_df, left_on='player', right_on='id')

# Convert date column to datetime
merged_df['date'] = pd.to_datetime(merged_df['date'])

# Variable for the span of days
span_days = 30

# Function to calculate max records in any span of days for a player
def max_records_in_span(player_data, days):
    player_data = player_data.sort_values(by='date')  # Sort by date
    max_records = 0
    for i in range(len(player_data)):
        start_date = player_data.iloc[i]['date']
        end_date = start_date + timedelta(days=days)
        records_in_span = player_data[
            (player_data['date'] >= start_date) & (player_data['date'] < end_date)
        ]
        max_records = max(max_records, len(records_in_span))
    return max_records

# Group by player and calculate max records in span for each
results = []
for player, player_data in merged_df.groupby('player_y'):
    max_records = max_records_in_span(player_data, span_days)
    results.append({'Player': player, f'MaxRecordsIn{span_days}Days': max_records})

# Create a DataFrame for the results
max_records_df = pd.DataFrame(results)

# Output results
print(max_records_df)
