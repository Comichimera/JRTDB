import pandas as pd

# Load datasets
records_df = pd.read_csv('records.csv')
players_df = pd.read_csv('players.csv')

# Merge records with player names
merged_df = records_df.merge(players_df, left_on='player', right_on='id')

# Count records per player per day
record_counts = (
    merged_df.groupby(['player_y', 'date'])
    .size()
    .reset_index(name='record_count')
)

# Find the maximum records set on a single day for each player
max_records_per_player = (
    record_counts.groupby('player_y')['record_count']
    .max()
    .reset_index()
    .rename(columns={'player_y': 'Player', 'record_count': 'MaxRecordsInADay'})
)

# Output results
print(max_records_per_player)