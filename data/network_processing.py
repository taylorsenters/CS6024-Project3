import pandas as pd
import json
from itertools import combinations
from collections import defaultdict

INPUT_CSV = 'data/tbbt_cleaned_data.csv'
OUTPUT_EDGES_JSON = 'data/network_edges.json'
OUTPUT_NODES_JSON = 'data/network_nodes.json'
MIN_CHAR_LINES = 100
SCENE_WINDOW = 5

def build_edges(df, window=5):
    co_occur = defaultdict(int)
    for (season, episode), ep_df in df.groupby(["Season", "Episode"]):
        chars_in_window = ep_df["Character"].tolist()
        for i in range(len(chars_in_window)):
            window_chars = set(chars_in_window[i : i + window])
            window_chars.discard(None)
            for a, b in combinations(sorted(window_chars), 2):
                if a != b:
                    co_occur[(a, b)] += 1
    return co_occur

def build_back_to_back(df):
    exchanges = defaultdict(int)
    for (season, episode), ep_df in df.groupby(["Season", "Episode"]):
        chars = ep_df["Character"].tolist()
        for i in range(len(chars) - 1):
            a, b = chars[i], chars[i + 1]
            if a != b:
                pair = tuple(sorted([a, b]))
                exchanges[pair] += 1
    return exchanges

def main():
    print("loading csv...")
    df = pd.read_csv(INPUT_CSV)
    df = df.dropna(subset=["Character", "Season", "Episode"])
    df["Season"] = df["Season"].astype(int)
    df["Episode"] = df["Episode"].astype(int)
    char_counts = df["Character"].value_counts()
    main_chars = set(char_counts[char_counts >= MIN_CHAR_LINES].index)
    df = df[df["Character"].isin(main_chars)]
    print("building edges...")
    scene_edges = build_edges(df, window=SCENE_WINDOW)
    exchange_edges = build_back_to_back(df)
    all_pairs = set(scene_edges.keys()) | set(exchange_edges.keys())
    edges = []
    for pair in all_pairs:
        a, b = pair
        edges.append({
            "source": a,
            "target": b,
            "scene_weight": scene_edges.get(pair, 0),
            "exchange_weight": exchange_edges.get(pair, 0),
            "weight": scene_edges.get(pair, 0) + exchange_edges.get(pair, 0)
        })
    edges.sort(key=lambda e: e["weight"], reverse=True)
    char_line_counts = df["Character"].value_counts().to_dict()
    strength = defaultdict(int)
    for e in edges:
        strength[e["source"]] += e["weight"]
        strength[e["target"]] += e["weight"]
    nodes = [
        {
            "id": char,
            "lines": int(char_line_counts.get(char, 0)),
            "strength": int(strength[char])
        }
        for char in main_chars
    ]
    nodes.sort(key=lambda n: n["lines"], reverse=True)
    with open(OUTPUT_EDGES_JSON, "w") as f:
        json.dump(edges, f, indent=2)
    with open(OUTPUT_NODES_JSON, "w") as f:
        json.dump(nodes, f, indent=2)
    print("Done! Saved " + str(len(edges)) + " edges and " + str(len(nodes)) + " nodes.")

main()