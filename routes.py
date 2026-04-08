# =====================================================================
#                        ЖАҢА СУПЕР ФУНКЦИЯЛАР
# =====================================================================

# 1. ҚАТЕЛЕР ДӘПТЕРІ - Қатені сақтау
@router.post("/errors/save")
def save_error(req: models.ErrorSubmit, authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    if not email: raise HTTPException(status_code=401, detail="Авторизациядан өтіңіз")
    
    new_error = models.ErrorRecord(
        user_email=email, topic=req.topic, question=req.question,
        user_answer=req.user_answer, correct_answer=req.correct_answer
    )
    db.add(new_error)
    db.commit()
    return {"message": "Қате дәптерге сақталды!"}

# Қателерді көру
@router.get("/errors")
def get_errors(authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    if not email: raise HTTPException(status_code=401, detail="Авторизациядан өтіңіз")
    errors = db.query(models.ErrorRecord).filter(models.ErrorRecord.user_email == email).order_by(models.ErrorRecord.created_at.desc()).all()
    return errors

# AI арқылы қатеге ұқсас жаңа есеп сұрау
@router.post("/errors/practice")
def practice_error(req: models.ErrorSubmit, authorization: str = Header(None)):
    prompt = f"Оқушы '{req.topic}' тақырыбында мына сұрақтан қате жіберді: '{req.question}'. Оның жауабы: {req.user_answer}. Дұрыс жауап: {req.correct_answer}. Оқушыға қатесін қысқаша түсіндіріп, дәл осыған ұқсас 1 ЖАҢА есеп (жауап нұсқаларымен) құрастырып бер."
    try:
        comp = ai_client.chat.completions.create(
            messages=[{"role": "system", "content": "Сен ҰБТ мұғалімісің. LaTeX қолдан."}, {"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant"
        )
        return {"reply": comp.choices[0].message.content}
    except:
        return {"reply": "Қате кетті."}

# 2. XP ДҮКЕНІ - Заттарды көру
@router.get("/store")
def get_store_items(db: Session = Depends(get_db)):
    # Егер дүкен бос болса, базаға автоматты түрде заттар қосамыз
    if db.query(models.StoreItem).count() == 0:
        items = [
            models.StoreItem(name="Отты Аватар", item_type="avatar", cost=500, value="https://api.dicebear.com/7.x/bottts/svg?seed=Fire"),
            models.StoreItem(name="Хакер Аватар", item_type="avatar", cost=1000, value="https://api.dicebear.com/7.x/bottts/svg?seed=Hacker"),
            models.StoreItem(name="Космос тақырыбы", item_type="theme", cost=2000, value="space-dark")
        ]
        db.add_all(items)
        db.commit()
    return db.query(models.StoreItem).all()

# Дүкеннен зат сатып алу
@router.post("/store/buy")
def buy_item(req: models.StoreBuy, authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    if not email: raise HTTPException(status_code=401, detail="Авторизациядан өтіңіз")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    item = db.query(models.StoreItem).filter(models.StoreItem.id == req.item_id).first()
    
    if not item: raise HTTPException(status_code=404, detail="Зат табылмады")
    if user.xp < item.cost: raise HTTPException(status_code=400, detail="XP жеткіліксіз!")
    
    # XP алу және инвентарьға қосу
    user.xp -= item.cost
    inventory = list(user.inventory) if user.inventory else []
    inventory.append(item.name)
    user.inventory = inventory
    
    if item.item_type == "avatar": user.avatar_url = item.value
    elif item.item_type == "theme": user.theme = item.value
        
    db.commit()
    return {"message": "Сәтті сатып алынды!", "new_xp": user.xp, "avatar_url": user.avatar_url}

# Токеннен email алуға арналған көмекші функция (жоғарыға қоссаң да болады)
def get_user_email_from_token(token: str):
    if not token: return None
    try:
        if token.startswith("Bearer "): token = token.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except: return None