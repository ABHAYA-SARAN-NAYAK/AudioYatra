import json
import re

MD_PLACES_RAW = """
| 1 | Taj Mahal, Agra, India | https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_from_Red_Fort-1.jpg |
| 2 | Red Fort, Delhi, India | https://commons.wikimedia.org/wiki/Special:FilePath/Delhi_Red_fort.jpg |
| 3 | Hampi, Karnataka, India | https://commons.wikimedia.org/wiki/Special:FilePath/Hampi_virupaksha_temple.jpg |
| 4 | India Gate, Delhi, India | https://commons.wikimedia.org/wiki/Special:FilePath/India_Gate_in_New_Delhi.jpg |
| 5 | Qutub Minar, Delhi, India | https://commons.wikimedia.org/wiki/Special:FilePath/Qutb_Minar_Delhi.jpg |
| 6 | Hawa Mahal, Jaipur, India | https://commons.wikimedia.org/wiki/Special:FilePath/Hawa_Mahal_2011.jpg |
| 7 | Amer Fort, Jaipur, India | https://commons.wikimedia.org/wiki/Special:FilePath/Amer_Fort_Jaipur.jpg |
| 8 | Gateway of India, Mumbai, India | https://commons.wikimedia.org/wiki/Special:FilePath/Gateway_of_India_Mumbai.jpg |
| 9 | Varanasi Ghats, Uttar Pradesh, India | https://commons.wikimedia.org/wiki/Special:FilePath/Varanasi_Ghats.jpg |
| 10 | Golden Temple, Amritsar, India | https://commons.wikimedia.org/wiki/Special:FilePath/Golden_Temple_India.jpg |
| 11 | Mysore Palace, Karnataka, India | https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace.jpg |
| 12 | Meenakshi Amman Temple, Madurai, India | https://commons.wikimedia.org/wiki/Special:FilePath/Meenakshi_Amman_Temple_Madurai.jpg |
| 13 | Charminar, Hyderabad, India | https://commons.wikimedia.org/wiki/Special:FilePath/Charminar_Hyderabad.jpg |
| 14 | Kerala Backwaters, India | https://commons.wikimedia.org/wiki/Special:FilePath/Kerala_backwaters.jpg |
| 15 | Dal Lake, Srinagar, India | https://commons.wikimedia.org/wiki/Special:FilePath/Dal_Lake_Srinagar.jpg |
| 16 | Eiffel Tower, Paris, France | https://commons.wikimedia.org/wiki/Special:FilePath/Eiffel_Tower_from_Trocad%C3%A9ro%2C_Paris.jpg |
| 17 | Colosseum, Rome, Italy | https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum%2C_Rome%2C_Italy.jpg |
| 18 | Statue of Liberty, New York, USA | https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_Liberty.jpg |
| 19 | Great Wall of China | https://commons.wikimedia.org/wiki/Special:FilePath/Great_Wall_of_China.jpg |
| 20 | Machu Picchu, Peru | https://commons.wikimedia.org/wiki/Special:FilePath/Machu_Picchu_Peru.jpg |
| 21 | Sydney Opera House, Australia | https://commons.wikimedia.org/wiki/Special:FilePath/Sydney_Opera_House_Sails.jpg |
| 22 | Burj Khalifa, Dubai, UAE | https://commons.wikimedia.org/wiki/Special:FilePath/Burj_Khalifa.jpg |
| 23 | Pyramids of Giza, Egypt | https://commons.wikimedia.org/wiki/Special:FilePath/Pyramids_of_Giza.jpg |
| 24 | Mount Fuji, Japan | https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Fuji_from_Lake_Kawaguchi.jpg |
| 25 | Santorini, Greece | https://commons.wikimedia.org/wiki/Special:FilePath/Santorini_Greece.jpg |
| 26 | Niagara Falls, Canada/USA | https://commons.wikimedia.org/wiki/Special:FilePath/Niagara_Falls.jpg |
| 27 | Grand Canyon, USA | https://commons.wikimedia.org/wiki/Special:FilePath/Grand_Canyon_view.jpg |
| 28 | Petra, Jordan | https://commons.wikimedia.org/wiki/Special:FilePath/Petra_Jordan.jpg |
| 29 | Angkor Wat, Cambodia | https://commons.wikimedia.org/wiki/Special:FilePath/Angkor_Wat_temple.jpg |
| 30 | Big Ben, London, United Kingdom | https://commons.wikimedia.org/wiki/Special:FilePath/Big_Ben_London.jpg |
"""

METADATA = {
    "Taj Mahal": {"lat": 27.1751, "lng": 78.0421, "city": "Agra", "country": "India", "region": "India", "category": "Historical", "emoji": "🕌", "gradient": "linear-gradient(135deg, #f5af19, #e17055)", "avgVisitMinutes": 150, "bestMonths": "Oct - Mar", "hook": "A timeless symbol of eternal love and Mughal perfection."},
    "Red Fort": {"lat": 28.6562, "lng": 77.2410, "city": "Delhi", "country": "India", "region": "India", "category": "Historical", "emoji": "🏰", "gradient": "linear-gradient(135deg, #eb3349, #f45c43)", "avgVisitMinutes": 120, "bestMonths": "Oct - Mar", "hook": "The formidable seat of Mughal emperors and freedom speeches."},
    "Hampi": {"lat": 15.3350, "lng": 76.4600, "city": "Karnataka", "country": "India", "region": "India", "category": "Historical", "emoji": "🏛️", "gradient": "linear-gradient(135deg, #f39c12, #d35400)", "avgVisitMinutes": 240, "bestMonths": "Nov - Feb", "hook": "Breathtaking boulder-strewn ruins of the Vijayanagara Empire."},
    "India Gate": {"lat": 28.6129, "lng": 77.2295, "city": "Delhi", "country": "India", "region": "India", "category": "Historical", "emoji": "🎖️", "gradient": "linear-gradient(135deg, #2c3e50, #bdc3c7)", "avgVisitMinutes": 60, "bestMonths": "Oct - Mar", "hook": "Triumphal arch honouring fallen heroes of World War I."},
    "Qutub Minar": {"lat": 28.5245, "lng": 77.1855, "city": "Delhi", "country": "India", "region": "India", "category": "Architecture", "emoji": "🗼", "gradient": "linear-gradient(135deg, #e67e22, #c0392b)", "avgVisitMinutes": 90, "bestMonths": "Oct - Mar", "hook": "The world's tallest brick minaret standing tall for 800 years."},
    "Hawa Mahal": {"lat": 26.9239, "lng": 75.8267, "city": "Jaipur", "country": "India", "region": "India", "category": "Architecture", "emoji": "🪟", "gradient": "linear-gradient(135deg, #ff7675, #d63031)", "avgVisitMinutes": 75, "bestMonths": "Oct - Mar", "hook": "Palace of Winds with 953 honeycombed jharokhas."},
    "Amer Fort": {"lat": 26.9855, "lng": 75.8513, "city": "Jaipur", "country": "India", "region": "India", "category": "Historical", "emoji": "🛡️", "gradient": "linear-gradient(135deg, #fdcb6e, #e17055)", "avgVisitMinutes": 150, "bestMonths": "Oct - Mar", "hook": "A majestic hilltop fortress featuring the shimmering Sheesh Mahal."},
    "Gateway of India": {"lat": 18.9220, "lng": 72.8347, "city": "Mumbai", "country": "India", "region": "India", "category": "City", "emoji": "⚓", "gradient": "linear-gradient(135deg, #0984e3, #74b9ff)", "avgVisitMinutes": 60, "bestMonths": "Nov - Feb", "hook": "Mumbai's waterfront arch guarding the Arabian Sea."},
    "Varanasi Ghats": {"lat": 25.3076, "lng": 83.0083, "city": "Varanasi", "country": "India", "region": "India", "category": "Spiritual", "emoji": "🪔", "gradient": "linear-gradient(135deg, #fd79a8, #e84393)", "avgVisitMinutes": 180, "bestMonths": "Oct - Mar", "hook": "Sacred riverbank steps alive with chanting, prayer, and Ganga Aarti."},
    "Golden Temple": {"lat": 31.6200, "lng": 74.8765, "city": "Amritsar", "country": "India", "region": "India", "category": "Spiritual", "emoji": "✨", "gradient": "linear-gradient(135deg, #ffeaa7, #fdcb6e)", "avgVisitMinutes": 120, "bestMonths": "Oct - Mar", "hook": "Spiritual soul of Sikhism shimmering across the Amrit Sarovar."},
    "Mysore Palace": {"lat": 12.3052, "lng": 76.6552, "city": "Mysuru", "country": "India", "region": "India", "category": "Architecture", "emoji": "👑", "gradient": "linear-gradient(135deg, #a29bfe, #6c5ce7)", "avgVisitMinutes": 120, "bestMonths": "Oct - Mar", "hook": "Indo-Saracenic royal residence illuminated by 100,000 bulbs."},
    "Meenakshi Amman Temple": {"lat": 9.9195, "lng": 78.1193, "city": "Madurai", "country": "India", "region": "India", "category": "Spiritual", "emoji": "🛕", "gradient": "linear-gradient(135deg, #00cec9, #0984e3)", "avgVisitMinutes": 150, "bestMonths": "Oct - Mar", "hook": "Soaring, vibrantly sculpted gopurams celebrating divine energy."},
    "Charminar": {"lat": 17.3616, "lng": 78.4747, "city": "Hyderabad", "country": "India", "region": "India", "category": "Historical", "emoji": "🕌", "gradient": "linear-gradient(135deg, #fab1a0, #ff7675)", "avgVisitMinutes": 60, "bestMonths": "Oct - Mar", "hook": "Four grand minarets anchoring the heart of old Hyderabad."},
    "Kerala Backwaters": {"lat": 9.4981, "lng": 76.3388, "city": "Alleppey", "country": "India", "region": "India", "category": "Nature", "emoji": "🛶", "gradient": "linear-gradient(135deg, #00b894, #00cec9)", "avgVisitMinutes": 300, "bestMonths": "Sep - Mar", "hook": "Tranquil network of emerald canals, lagoons, and houseboats."},
    "Dal Lake": {"lat": 34.1130, "lng": 74.8700, "city": "Srinagar", "country": "India", "region": "India", "category": "Nature", "emoji": "🏔️", "gradient": "linear-gradient(135deg, #74b9ff, #0984e3)", "avgVisitMinutes": 180, "bestMonths": "Apr - Oct", "hook": "Jewel in Kashmir's crown, renowned for shikaras and floating gardens."},
    "Eiffel Tower": {"lat": 48.8584, "lng": 2.2945, "city": "Paris", "country": "France", "region": "Europe", "category": "Architecture", "emoji": "🗼", "gradient": "linear-gradient(135deg, #2d3436, #636e72)", "avgVisitMinutes": 120, "bestMonths": "Apr - Oct", "hook": "The timeless wrought-iron icon of Parisian elegance."},
    "Colosseum": {"lat": 41.8902, "lng": 12.4922, "city": "Rome", "country": "Italy", "region": "Europe", "category": "Historical", "emoji": "🏛️", "gradient": "linear-gradient(135deg, #b2bec3, #636e72)", "avgVisitMinutes": 150, "bestMonths": "Mar - Nov", "hook": "Epic Roman amphitheatre echo of gladiator triumphs and empire."},
    "Statue of Liberty": {"lat": 40.6892, "lng": -74.0445, "city": "New York", "country": "USA", "region": "Americas", "category": "Historical", "emoji": "🗽", "gradient": "linear-gradient(135deg, #55efc4, #00b894)", "avgVisitMinutes": 180, "bestMonths": "Apr - Oct", "hook": "Beacon of liberty greeting arrivals in New York Harbour."},
    "Great Wall of China": {"lat": 40.4319, "lng": 116.5704, "city": "Beijing", "country": "China", "region": "Asia", "category": "Historical", "emoji": "🧱", "gradient": "linear-gradient(135deg, #636e72, #2d3436)", "avgVisitMinutes": 240, "bestMonths": "Apr - May, Sep - Oct", "hook": "Monumental defensive ramparts winding through rugged mountain peaks."},
    "Machu Picchu": {"lat": -13.1631, "lng": -72.5450, "city": "Cusco", "country": "Peru", "region": "Americas", "category": "Historical", "emoji": "⛰️", "gradient": "linear-gradient(135deg, #2ecc71, #27ae60)", "avgVisitMinutes": 240, "bestMonths": "May - Oct", "hook": "Mystical Incan citadel nestled amidst misty Andean peaks."},
    "Sydney Opera House": {"lat": -33.8568, "lng": 151.2153, "city": "Sydney", "country": "Australia", "region": "Oceania", "category": "Architecture", "emoji": "🎭", "gradient": "linear-gradient(135deg, #3498db, #2980b9)", "avgVisitMinutes": 90, "bestMonths": "Sep - Apr", "hook": "Sculptural shell sails redefining modern harbour architecture."},
    "Burj Khalifa": {"lat": 25.1972, "lng": 55.2744, "city": "Dubai", "country": "UAE", "region": "Asia", "category": "Architecture", "emoji": "🏙️", "gradient": "linear-gradient(135deg, #f1c40f, #f39c12)", "avgVisitMinutes": 120, "bestMonths": "Nov - Mar", "hook": "World's tallest skyscraper piercing Dubai's skyline at 828m."},
    "Pyramids of Giza": {"lat": 29.9792, "lng": 31.1342, "city": "Giza", "country": "Egypt", "region": "Africa", "category": "Historical", "emoji": "🔺", "gradient": "linear-gradient(135deg, #e67e22, #d35400)", "avgVisitMinutes": 180, "bestMonths": "Oct - Apr", "hook": "Ancient Wonders of the World guarding 4,500 years of pharaoh mysteries."},
    "Mount Fuji": {"lat": 35.3606, "lng": 138.7274, "city": "Honshu", "country": "Japan", "region": "Asia", "category": "Nature", "emoji": "🌋", "gradient": "linear-gradient(135deg, #e74c3c, #c0392b)", "avgVisitMinutes": 300, "bestMonths": "Jul - Sep", "hook": "Sacred snow-capped volcano embodying Japan's natural spirit."},
    "Santorini": {"lat": 36.3932, "lng": 25.4615, "city": "Cyclades", "country": "Greece", "region": "Europe", "category": "Nature", "emoji": "🏝️", "gradient": "linear-gradient(135deg, #0984e3, #dfe6e9)", "avgVisitMinutes": 240, "bestMonths": "Apr - Oct", "hook": "Whitewashed caldera cliff villages perched over the Aegean Sea."},
    "Niagara Falls": {"lat": 43.0962, "lng": -79.0377, "city": "Ontario/NY", "country": "Canada/USA", "region": "Americas", "category": "Nature", "emoji": "🌊", "gradient": "linear-gradient(135deg, #00cec9, #74b9ff)", "avgVisitMinutes": 150, "bestMonths": "May - Oct", "hook": "Thundering wall of rushing water between two great nations."},
    "Grand Canyon": {"lat": 36.1069, "lng": -112.1129, "city": "Arizona", "country": "USA", "region": "Americas", "category": "Nature", "emoji": "🏜️", "gradient": "linear-gradient(135deg, #e17055, #d63031)", "avgVisitMinutes": 240, "bestMonths": "Mar - May, Sep - Nov", "hook": "Immense natural chasm carved by the Colorado River across eons."},
    "Petra": {"lat": 30.3285, "lng": 35.4444, "city": "Ma'an", "country": "Jordan", "region": "Asia", "category": "Historical", "emoji": "🏺", "gradient": "linear-gradient(135deg, #e17055, #b2bec3)", "avgVisitMinutes": 240, "bestMonths": "Mar - May, Sep - Nov", "hook": "The Rose-Red city carved directly into sheer sandstone desert cliffs."},
    "Angkor Wat": {"lat": 13.4125, "lng": 103.8670, "city": "Siem Reap", "country": "Cambodia", "region": "Asia", "category": "Historical", "emoji": "🛕", "gradient": "linear-gradient(135deg, #27ae60, #2c3e50)", "avgVisitMinutes": 240, "bestMonths": "Nov - Mar", "hook": "Colossal Khmer temple complex representing Mount Meru on Earth."},
    "Big Ben": {"lat": 51.5007, "lng": -0.1246, "city": "London", "country": "United Kingdom", "region": "Europe", "category": "Architecture", "emoji": "🕰️", "gradient": "linear-gradient(135deg, #2c3e50, #34495e)", "avgVisitMinutes": 60, "bestMonths": "May - Sep", "hook": "London's neo-Gothic Elizabeth Tower chiming across Westminster."}
}

def build():
    places = []
    lines = [line.strip() for line in MD_PLACES_RAW.strip().split("\n") if line.strip().startswith("|")]
    
    for line in lines:
        parts = [p.strip() for p in line.split("|") if p.strip()]
        if len(parts) >= 3 and parts[0].isdigit():
            idx = int(parts[0])
            raw_title = parts[1]
            img_url = parts[2]
            
            clean_name = raw_title.split(",")[0].strip()
            meta = METADATA.get(clean_name, {})
            
            place_obj = {
                "id": f"place_{idx:02d}",
                "name": clean_name,
                "fullName": raw_title,
                "city": meta.get("city", "World"),
                "country": meta.get("country", "Global"),
                "region": meta.get("region", "All"),
                "category": meta.get("category", "Historical"),
                "lat": meta.get("lat", 0.0),
                "lng": meta.get("lng", 0.0),
                "image": img_url,
                "emoji": meta.get("emoji", "📍"),
                "gradient": meta.get("gradient", "linear-gradient(135deg, #334155, #0f172a)"),
                "avgVisitMinutes": meta.get("avgVisitMinutes", 120),
                "bestMonths": meta.get("bestMonths", "All Year"),
                "shortHook": meta.get("hook", "Discover captivating stories and history.")
            }
            places.append(place_obj)

    with open("places.json", "w", encoding="utf-8") as f:
        json.dump(places, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully generated places.json with {len(places)} verified places.")

if __name__ == "__main__":
    build()
