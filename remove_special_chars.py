import csv
import re

# File path
file_path = "directory(in).csv"

# Function to clean text
def clean_text(text):
    if not text:
        return text
    
    # Remove non-ASCII characters (gets rid of � and weird encoding issues)
    text = text.encode("ascii", "ignore").decode()
    
    # Optional: remove extra weird symbols but keep basic punctuation
    text = re.sub(r"[^\w\s.,;:'\"!?()-]", "", text)
    
    return text.strip()

# Read and clean
rows = []
with open(file_path, "r", encoding="utf-8", newline="") as infile:
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames
    
    for row in reader:
        if "Description" in row:
            row["Description"] = clean_text(row["Description"])
        rows.append(row)

# Write back to SAME file
with open(file_path, "w", encoding="utf-8", newline="") as outfile:
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print("Descriptions cleaned successfully.")
