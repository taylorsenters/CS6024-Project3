import pandas as pd
import re

# 1. Load the original Kaggle dataset
df = pd.read_csv('data/1_10_seasons_tbbt.csv')

# 2. Extract Season, Episode, and Title
df['Season'] = df['episode_name'].str.extract(r'Series\s+(\d+)').astype(float)
df['Episode'] = df['episode_name'].str.extract(r'Episode\s+(\d+)').astype(float)
df['Episode_Title'] = df['episode_name'].str.split(r' – | - ', n=1).str[1].str.strip()

# 3. Create the Full Location Descriptor column
df.loc[df['person_scene'] == 'Scene', 'Full_Location_Descriptor'] = df['dialogue']
df['Full_Location_Descriptor'] = df['Full_Location_Descriptor'].ffill()

# 4. Filter out the original Scene rows
df_clean = df[df['person_scene'] != 'Scene'].copy()

# 5. Clean Stage Directions from Dialogue & Remove Quotation Marks
df_clean['Dialogue'] = df_clean['dialogue'].apply(
    lambda x: re.sub(r'\(.*?\)|\[.*?\]', '', str(x)).strip()
)
df_clean['Dialogue'] = df_clean['Dialogue'].apply(
    lambda x: re.sub(r'["“”]', '', str(x))
)

# 6. Extract the Core Location from the Full Descriptor
def extract_core_location(text):
    text_lower = str(text).lower()
    
    # Dictionary of core TBBT sets (Order matters: most specific to least specific)
    locations = {
        r"leonard.*car": "Leonard's Car",
        r"howard.*car": "Howard's Car",
        r"penny.*car": "Penny's Car",
        r"penny.*apartment": "Penny's Apartment",
        r"penny.*bedroom": "Penny's Bedroom",
        r"sheldon and leonard.*apartment": "Sheldon & Leonard's Apartment",
        r"leonard and sheldon.*apartment": "Sheldon & Leonard's Apartment",
        r"sheldon.*bedroom": "Sheldon's Bedroom",
        r"leonard.*bedroom": "Leonard's Bedroom",
        r"howard.*house": "Howard's House",
        r"howard.*bedroom": "Howard's Bedroom",
        r"raj.*apartment": "Raj's Apartment",
        r"cafeteria": "Caltech Cafeteria",
        r"comic book store": "Comic Book Store",
        r"cheesecake factory": "Cheesecake Factory",
        r"stair": "Stairwell",
        r"hallway": "Hallway",
        r"laundry room": "Laundry Room",
        r"physics lab": "Physics Lab",
        r"sperm bank": "Sperm Bank",
        r"office": "University Office",
        r"hospital": "Hospital",
        r"living room": "Sheldon & Leonard's Apartment", # Generic living room usually implies 4A
        r"the apartment": "Sheldon & Leonard's Apartment"
    }
    
    # Check against our known dictionary
    for pattern, clean_name in locations.items():
        if re.search(pattern, text_lower):
            return clean_name
            
    # Fallback: If it's a totally new location, take the first phrase before a comma or period
    first_part = re.split(r'[.,]', str(text))[0].strip()
    # Strip leading words like "Inside ", "Outside ", "All 5 in " so it's clean
    first_part = re.sub(r'(?i)^(inside|outside|back at|all \w+ in|a|the)\s+', '', first_part)
    return first_part.title()

# Apply the extraction function
df_clean['Location'] = df_clean['Full_Location_Descriptor'].apply(extract_core_location)

# 7. Final Formatting
df_clean = df_clean.rename(columns={'person_scene': 'Character'})
df_clean = df_clean[['Season', 'Episode', 'Episode_Title', 'Full_Location_Descriptor', 'Location', 'Character', 'Dialogue']]

# Drop any rows where the dialogue became completely empty
df_clean = df_clean[df_clean['Dialogue'] != '']
df_clean = df_clean.dropna(subset=['Dialogue'])

# 8. Export for D3
df_clean.to_csv('data/tbbt_cleaned_data.csv', index=False)
print("Finished saving tbbt_cleaned_data.csv with split locations!")