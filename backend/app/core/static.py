import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


def mount_static_files(app: FastAPI) -> None:
    """정적 파일을 /app 경로에 마운트 (public 디렉토리가 존재하는 경우)"""
    if os.path.exists("public"):
        app.mount("/app", StaticFiles(directory="public", html=True), name="static")
