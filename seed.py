from database import SessionLocal, engine
import models

def seed_data():
    print("⏳ Деректер базасын құрудамыз...")
    
    # 1. ЕСКІ КЕСТЕЛЕРДІ ТҮБІРІМЕН ЖОЮ (Қатені түзейтін сиқырлы жол осы)
    models.Base.metadata.drop_all(bind=engine) 
    
    # 2. ЖАҢАДАН ТАЗА ЕТІП ҚҰРУ
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    
    try:
        # Ескі деректерді тазалау (қайталанбас үшін)
        db.query(models.Lesson).delete()
        db.query(models.Module).delete()
        db.query(models.Course).delete()
        db.commit()

        # 1. ПӘНДЕРДІ ҚОСУ
        c1 = models.Course(id=1, title="Математикалық сауаттылық", description="Логика және сандық талқылау", image_url="https://avatars.mds.yandex.net/get-altay/2369731/2a00000170a4c2f2c8d2347b746c1e30a5f9/orig")
        c2 = models.Course(id=2, title="Математика", description="Бейіндік математика курсы", image_url="https://i.pinimg.com/originals/11/4d/9d/114d9d4f9d6c7075c1d63603099955e8.jpg")
        c3 = models.Course(id=3, title="Информатика", description="Программалау және IT негіздері", image_url="https://sun9-22.userapi.com/impf/c850232/v850232877/10f76a/Y3S_AAn4E0s.jpg?size=604x402&quality=96&sign=c5f7d3d8a946b5a3e9c5f7d3d8a946b5&type=album")
        db.add_all([c1, c2, c3])
        db.commit()

        # 2. МОДУЛЬДЕРДІ ҚОСУ
        modules = [
            models.Module(id=1, title="Сандық талқылау", course_id=1),
            models.Module(id=2, title="Анықсыздық", course_id=1),
            models.Module(id=3, title="Өзгерістер мен тәуелділіктер", course_id=1),
            models.Module(id=4, title="Кеңістік пен форма", course_id=1),

            models.Module(id=5, title="Сандар", course_id=2),
            models.Module(id=6, title="Теңдеулер", course_id=2),
            models.Module(id=7, title="Теңдеулер жүйесі", course_id=2),
            models.Module(id=8, title="Теңсіздіктер", course_id=2),
            models.Module(id=9, title="Тізбектер", course_id=2),
            models.Module(id=10, title="Планиметрия", course_id=2),
            models.Module(id=11, title="Стереометрия", course_id=2),

            models.Module(id=12, title="Компьютерлік жүйелер", course_id=3),
            models.Module(id=13, title="Ақпараттық процестер", course_id=3),
            models.Module(id=14, title="Компьютерлік ойлау (Python)", course_id=3),
            models.Module(id=15, title="Деректер қоры (SQL)", course_id=3)
        ]
        db.add_all(modules)
        db.commit()

        # 3. ТАҚЫРЫПТАРДЫ ҚОСУ
        lessons = [
            # Мат. сауаттылық
            models.Lesson(title="Сандық өрнектермен берілген логикалық тапсырмалар", module_id=1),
            models.Lesson(title="Теңдеулер көмегімен шешілетін мәтінді есептер", module_id=1),
            models.Lesson(title="Пайыздық есептеулер және диаграммалар", module_id=1),
            models.Lesson(title="Арифметикалық орта, құлаш, медиана, мода", module_id=2),
            models.Lesson(title="Ықтималдықтар теориясы мен комбинаторика", module_id=2),
            models.Lesson(title="Тәуелді өзгерістерге берілген есептер", module_id=3),
            models.Lesson(title="Тізбектер және кестелерді талдау", module_id=3),
            models.Lesson(title="Геометриялық мазмұндағы логикалық есептер", module_id=4),
            models.Lesson(title="Периметр мен аудан формулаларын қолдану", module_id=4),
            models.Lesson(title="Геометриялық денелердің бет аудандары", module_id=4),

            # Математика
            models.Lesson(title="Түбірлер мен дәрежелерге амалдар қолдану", module_id=5),
            models.Lesson(title="Тригонометриялық өрнектерді түрлендіру", module_id=5),
            models.Lesson(title="Сызықтық және квадраттық теңдеулер", module_id=6),
            models.Lesson(title="Логарифмдік және көрсеткіштік теңдеулер", module_id=6),
            models.Lesson(title="Екі айнымалысы бар теңдеулер жүйесі", module_id=7),
            models.Lesson(title="Рационал және иррационал теңсіздіктер", module_id=8),
            models.Lesson(title="Прогрессиялар: Арифметикалық және геометриялық", module_id=9),
            models.Lesson(title="Үшбұрыштар мен төртбұрыштардың қасиеттері", module_id=10),
            models.Lesson(title="Кеңістіктегі фигуралар мен векторлар", module_id=11),

            # Информатика
            models.Lesson(title="Компьютердің құрылғылары мен желілер", module_id=12),
            models.Lesson(title="Ақпаратты өлшеу және кодтау", module_id=13),
            models.Lesson(title="Python-да алгоритмдерді программалау", module_id=14),
            models.Lesson(title="Реляциондық деректер қоры және сұраныстар", module_id=15)
        ]
        db.add_all(lessons)
        db.commit()
        print("✅ Барлық модульдер мен тақырыптар сәтті жүктелді!")
    
    except Exception as e:
        print(f"❌ Қате шықты: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()