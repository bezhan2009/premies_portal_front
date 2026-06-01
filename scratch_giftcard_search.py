with open("src/pages/general/GiftCard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(45, 180):
    if i < len(lines):
        print(f"{i+1}: {lines[i].strip()}")
