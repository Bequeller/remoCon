from fastapi import APIRouter
from fastapi.responses import RedirectResponse

router = APIRouter()


@router.get("/")
async def root_index():
    return RedirectResponse(url="/app/")


@router.get("/rules/")
async def rules_redirect():
    return RedirectResponse(url="/app/rules.html")
