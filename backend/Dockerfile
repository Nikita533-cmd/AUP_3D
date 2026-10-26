FROM python:3.11

ENV PYTHONUNBUFFERED=1 

RUN mkdir -p /app 
WORKDIR /app
RUN pip install -i https://pypi-mirror.gitverse.ru/simple/ django-import-export
RUN pip install -i https://pypi-mirror.gitverse.ru/simple/ gunicorn

COPY requirements.txt .
RUN pip install -i https://pypi-mirror.gitverse.ru/simple/ -r requirements.txt 

COPY . .

CMD ["gunicorn", "main.wsgi:application", "--bind", "0.0.0.0:8000", "--timeout", "6000", "--reload"]