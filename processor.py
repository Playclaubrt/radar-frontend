import sys
import json

def processar_especial(lat, lon):
    # Lógica que o JS delega ao Python
    return {"status": "OK", "risco_severo": "Analizando..."}

if __name__ == "__main__":
    if len(sys.argv) > 2:
        print(json.dumps(processar_especial(sys.argv[1], sys.argv[2])))
