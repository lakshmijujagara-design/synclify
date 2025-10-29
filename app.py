from flask import Flask, render_template
import pandas as pd
from prophet import Prophet

app = Flask(__name__)

@app.route('/')
def index():
    # Load dataset
    df = pd.read_csv('data/car24_data.csv')

    # Create and train Prophet model
    model = Prophet()
    model.fit(df)

    # Predict next 7 days
    future = model.make_future_dataframe(periods=7)
    forecast = model.predict(future)

    # Get only predicted values
    next_week = forecast[['ds', 'yhat']].tail(7)

    # Convert to list for displaying in HTML
    predictions = next_week.values.tolist()

    return render_template('index.html', predictions=predictions)

if __name__ == '__main__':
    app.run(debug=True)
