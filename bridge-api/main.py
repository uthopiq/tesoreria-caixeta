from fastapi import FastAPI, HTTPException, Header, Depends
import pandas as pd
import shutil
import os
import pyodbc
from fastapi.middleware.cors import CORSMiddleware

# --- CONFIGURACIÓN ---
app = FastAPI(title="Factusol Bridge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que la web de React se conecte
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas absolutas para Windows
ORIGINAL_DB = r"C:\Users\tomas\Desktop\proyecto-factusol\bridge-api\data\0012026.accdb"
TEMP_DB = r"C:\Users\tomas\Desktop\proyecto-factusol\bridge-api\temp_factusol.accdb"
API_KEY_SECRET = "TuSuperClaveSecreta123"

# --- SEGURIDAD ---
def get_api_key(x_api_key: str = Header(None)):
    """Valida la clave API. Si falla, lanza 403."""
    if x_api_key != API_KEY_SECRET:
        raise HTTPException(status_code=403, detail="Clave API inválida")
    return x_api_key

def get_db_connection(db_path: str):
    """Conexión nativa de Windows."""
    conn_str = (
        r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
        f'DBQ={db_path};'
    )
    return pyodbc.connect(conn_str)

# --- ENDPOINTS ---

@app.get("/health")
def health_check():
    return {"status": "online", "file_found": os.path.exists(ORIGINAL_DB)}

@app.get("/facturas")
def get_facturas(api_key: str = Depends(get_api_key)):
    """Lee facturas de forma sólida usando SQL puro."""
    try:
        # 1. Copia de seguridad para no bloquear el archivo
        shutil.copyfile(ORIGINAL_DB, TEMP_DB)
        
        # 2. Conexión y lectura con Pandas (SQL Nativo)
        conn = get_db_connection(TEMP_DB)
        query = "SELECT TIPFAC, CODFAC, CLIFAC, FECFAC, ESTFAC, NET1FAC FROM F_FAC WHERE ESTFAC IN (0, 1)"
        df = pd.read_sql(query, conn)
        conn.close()
        
        # 3. Limpieza y borrado de temporal
        if os.path.exists(TEMP_DB): os.remove(TEMP_DB)
        return df.fillna(0).to_dict(orient="records")
        
    except Exception as e:
        if os.path.exists(TEMP_DB): os.remove(TEMP_DB)
        raise HTTPException(status_code=500, detail=f"Error al leer facturas: {str(e)}")

@app.get("/clientes")
def get_clientes(api_key: str = Depends(get_api_key)):
    """Lee clientes de forma rápida."""
    try:
        shutil.copyfile(ORIGINAL_DB, TEMP_DB)
        conn = get_db_connection(TEMP_DB)
        query = "SELECT CODCLI, NOFCLI, NIFCLI FROM F_CLI"
        df = pd.read_sql(query, conn)
        conn.close()
        
        if os.path.exists(TEMP_DB): os.remove(TEMP_DB)
        return df.fillna("").to_dict(orient="records")
    except Exception as e:
        if os.path.exists(TEMP_DB): os.remove(TEMP_DB)
        raise HTTPException(status_code=500, detail=f"Error al leer clientes: {str(e)}")

@app.put("/facturas/{serie}/{numero}/cobrar")
def cobrar_factura(serie: str, numero: int, api_key: str = Depends(get_api_key)):
    """Actualiza el estado de la factura en el archivo original."""
    try:
        conn = get_db_connection(ORIGINAL_DB)
        cursor = conn.cursor()
        query = f"UPDATE [F_FAC] SET [ESTFAC] = 1 WHERE [TIPFAC] = '{serie}' AND [CODFAC] = {numero}"
        cursor.execute(query)
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Factura {serie}-{numero} cobrada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CONEXIÓN A POSTGRES (DOCKER) ---
def get_postgres_conn():
    import psycopg2
    # Usamos los datos EXACTOS del docker-compose.yml o la bbdd actual
    return psycopg2.connect(
        host="localhost",
        database="caixeta_db",      
        user="admin",           
        password="password123",
        port="5432",
        connect_timeout=5       # Para que no se cuelgue si falla
    )

@app.get("/bancos")
def get_bancos(api_key: str = Depends(get_api_key)):
    try:
        conn = get_postgres_conn()
        cur = conn.cursor()
        # Usamos la tabla 'banks' y sus columnas reales: bank_name y current_balance
        cur.execute("SELECT id, bank_name, current_balance, currency FROM banks")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        # Mapeamos los datos para que tu tabla de React los entienda
        return [
            {
                "id": str(r[0]), 
                "fecha": "Saldo Actual", 
                "concepto": r[1],      # Nombre del banco (Sabadell)
                "importe": float(r[2]), # Saldo (1400.00)
                "estado": r[3]         # Moneda (EUR)
            } 
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la consulta: {str(e)}")