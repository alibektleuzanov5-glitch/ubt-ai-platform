import telebot
from database import SessionLocal
import models

bot = telebot.TeleBot("СЕНІҢ_ТЕЛЕГРАМ_ТОКЕНІҢДІ_ОСЫНДА_ЖАЗ")

@bot.message_handler(commands=['start'])
def start(m): bot.send_message(m.chat.id, "Сәлем! Оқушының 6 санды кодын жазыңыз:")

@bot.message_handler(func=lambda m: m.text.isdigit() and len(m.text) == 6)
def link(m):
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.parent_link_code == m.text).first()
    if user:
        user.parent_chat_id = str(m.chat.id); db.commit()
        bot.reply_to(m, f"✅ {user.name} оқушысымен байланысты. Есеп үшін /report басыңыз.")
    else: bot.reply_to(m, "❌ Код қате.")
    db.close()

@bot.message_handler(commands=['report'])
def report(m):
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.parent_chat_id == str(m.chat.id)).first()
    if user:
        errs = db.query(models.ErrorRecord).filter(models.ErrorRecord.user_email == user.email).count()
        bot.send_message(m.chat.id, f"📊 **Есеп:**\n🏆 XP: {user.xp}\n🔥 Күн: {user.streak}\n🏅 Лига: {user.league}\n🧠 Қателер: {errs}")
    db.close()

if __name__ == "__main__": bot.polling(none_stop=True)