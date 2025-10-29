import pandas as pd

data = {
    "date": [
        "2025-10-01", "2025-10-02", "2025-10-03", "2025-10-04",
        "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08",
        "2025-10-09", "2025-10-10"
    ],
    "keyword": [
        "sell car online", "car valuation", "used car price", "buy used car",
        "car resale value", "sell used car", "car inspection", "sell car online",
        "used car dealer", "car valuation"
    ],
    "search_volume": [1200, 1350, 1550, 1620, 1700, 1800, 1900, 2000, 2100, 2300]
}

df = pd.DataFrame(data)
df.to_csv("car_24data.csv", index=False)
print("✅ car_24data.csv created successfully!")
