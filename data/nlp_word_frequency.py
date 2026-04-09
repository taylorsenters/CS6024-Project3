import pandas as pd
import re
import json
from collections import Counter

INPUT_CSV = 'data/tbbt_cleaned_data.csv'
OUTPUT_JSON = 'data/word_frequencies.json'
TOP_N = 50
MIN_CHARS = 100

STOP_WORDS = {
    "i","me","my","myself","we","our","ours","ourselves","you","your","yours",
    "yourself","yourselves","he","him","his","himself","she","her","hers",
    "herself","it","its","itself","they","them","their","theirs","themselves",
    "what","which","who","whom","this","that","these","those","am","is","are",
    "was","were","be","been","being","have","has","had","having","do","does",
    "did","doing","a","an","the","and","but","if","or","because","as","until",
    "while","of","at","by","for","with","about","against","between","into",
    "through","during","before","after","above","below","to","from","up","down",
    "in","out","on","off","over","under","again","further","then","once","here",
    "there","when","where","why","how","all","both","each","few","more","most",
    "other","some","such","no","nor","not","only","own","same","so","than",
    "too","very","s","t","can","will","just","don","should","now","d","ll",
    "m","o","re","ve","y","ain","aren","couldn","didn","doesn","hadn","hasn",
    "haven","isn","ma","mightn","mustn","needn","shan","shouldn","wasn","weren",
    "won","wouldn","get","got","go","going","come","came","know","think","like",
    "said","say","says","saying","make","made","want","really","well",
    "yeah","oh","okay","ok","hey","right","um","uh","mean","look","good",
    "way","thing","time","people","little","would","could","never",
    "actually","something","anything","nothing","everything","one","two","three",
    "also","back","even","still","already","around","though","us","let",
    "see","need","tell","told","much","many","things","put","take",
    "may","might","shall","yes","feel","felt","always","every",
    "lot","sure","guess","thought","pretty","kind","trying","try","tried"
}

def tokenize(text):
    text = str(text).lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    words = text.split()
    return [w for w in words if w not in STOP_WORDS and len(w) > 2]

def main():
    print("loading csv...")
    df = pd.read_csv(INPUT_CSV)
    df = df.dropna(subset=["Dialogue", "Character", "Season"])
    df["Season"] = df["Season"].astype(int)
    char_counts = df["Character"].value_counts()
    main_chars = char_counts[char_counts >= MIN_CHARS].index.tolist()
    df = df[df["Character"].isin(main_chars)]
    result = {}
    for char, char_df in df.groupby("Character"):
        print("processing " + char)
        result[char] = {}
        result[char]["by_season"] = {}
        all_words = []
        for line in char_df["Dialogue"]:
            all_words.extend(tokenize(line))
        top_all = Counter(all_words).most_common(TOP_N)
        result[char]["all"] = [{"word": w, "count": c} for w, c in top_all]
        for season, season_df in char_df.groupby("Season"):
            season_words = []
            for line in season_df["Dialogue"]:
                season_words.extend(tokenize(line))
            top_season = Counter(season_words).most_common(TOP_N)
            result[char]["by_season"][str(season)] = [{"word": w, "count": c} for w, c in top_season]
    with open(OUTPUT_JSON, "w") as f:
        json.dump(result, f, indent=2)
    print("Done! Saved " + str(len(result)) + " characters.")

main()