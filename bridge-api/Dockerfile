FROM python:3.9-slim

# Instalamos herramientas de sistema para Access
RUN apt-get update && apt-get install -y \
    unixodbc \
    unixodbc-dev \
    mdbtools \
    odbc-mdbtools \
    && rm -rf /var/lib/apt/lists/*

# Registro del driver
RUN echo "[MDBTools]\nDescription=MDBTools Driver\nDriver=/usr/lib/x86_64-linux-gnu/odbc/libmdbodbc.so\nSetup=/usr/lib/x86_64-linux-gnu/odbc/libmdbodbc.so\nFileUsage=1" > /etc/odbcinst.ini

WORKDIR /app
COPY . .

# ¡Aquí añadimos pandas_access!
RUN pip install fastapi uvicorn pyodbc pandas pandas_access

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]