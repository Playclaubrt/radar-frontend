from flask import Flask, jsonify, request
from flask_cors import CORS
import requests, feedparser, os

app = Flask(__name__)
CORS(app)

OWM_KEY = os.getenv("OWM_KEY")  # coloque no Render

# ================= INMET =================
@app.route("/inmet")
def inmet():
    resultado = {"geograficos": [], "textuais": []}

    # NÃO TEXTUAL (API)
    try:
        r = requests.get("https://alertas2.inmet.gov.br/api/alertas")
        for a in r.json():
            resultado["geograficos"].append({
                "nivel": a.get("nivel"),
                "evento": a.get("evento"),
                "descricao": a.get("descricao"),
                "inicio": a.get("inicio"),
                "fim": a.get("fim"),
                "areas": a.get("areas")
            })
    except:
        pass

    # TEXTUAL (RSS)
    try:
        feed = feedparser.parse("https://alertas2.inmet.gov.br/rss")
        for e in feed.entries:
            resultado["textuais"].append({
                "titulo": e.title,
                "texto": e.description,
                "data": e.published
            })
    except:
        pass

    return jsonify(resultado)


# ================= NOAA =================
@app.route("/noaa")
def noaa():
    alerts = []
    try:
        r = requests.get("https://api.weather.gov/alerts/active")
        for f in r.json()["features"]:
            p = f["properties"]
            alerts.append({
                "evento": p["event"],
                "texto": p["description"],
                "inicio": p["effective"],
                "fim": p["expires"],
                "area": p["areaDesc"]
            })
    except:
        pass
    return jsonify(alerts)


# ================= OWM =================
@app.route("/owm")
def owm():
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    atual = requests.get(
        f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OWM_KEY}&units=metric&lang=pt"
    ).json()

    forecast = requests.get(
        f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={OWM_KEY}&units=metric&lang=pt"
    ).json()

    return jsonify({
        "atual": {
            "temp": atual["main"]["temp"],
            "umidade": atual["main"]["humidity"],
            "pressao": atual["main"]["pressure"],
            "vento": atual["wind"]["speed"] * 3.6,
            "tempo": atual["weather"][0]["description"]
        },
        "previsao": forecast["list"]
    })


@app.route("/")
def home():
    return "Radar Backend Online"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)