from flask import Flask, render_template, jsonify
import pandas as pd
from prophet import Prophet

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict_keywords')
def predict_keywords():
    # Load CSV data
    df = pd.read_csv('car_24data.csv')

    # Rename for Prophet
    df = df.rename(columns={'date': 'ds', 'search_volume': 'y'})

    # Train Prophet model
    model = Prophet()
    model.fit(df)

    # Predict next 7 days
    future = model.make_future_dataframe(periods=7)
    forecast = model.predict(future)

    # Combine forecast with keywords (just latest trends)
    last_week = forecast.tail(7)
    trend = last_week[['ds', 'yhat']].rename(columns={'ds': 'date', 'yhat': 'predicted_volume'})

    # Get top keywords (simply return keywords with recent highest volume)
    top_keywords = df.groupby('keyword')['y'].sum().sort_values(ascending=False).head(5)
    top_keywords = top_keywords.reset_index().rename(columns={'y': 'total_searches'})

    return jsonify({
        'trend': trend.to_dict(orient='records'),
        'top_keywords': top_keywords.to_dict(orient='records')
    })

if __name__ == '__main__':
    app.run(debug=True)
