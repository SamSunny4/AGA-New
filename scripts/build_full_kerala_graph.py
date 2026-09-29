#!/usr/bin/env python3
"""
Full Kerala Evacuation Graph Builder
Builds a statewide 55+ node, 16 shelter, 85+ corridor evacuation network for PlanEsc.
Fetches real turn-by-turn driving polylines via OSRM.
"""

import json
import math
import os
import sys
import time
import urllib.request
from typing import Dict, List, Any

# Ensure stdout handles utf-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")
JS_DIR = os.path.join(PROJECT_DIR, "js")
os.makedirs(DATA_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# 1. DEFINE ALL 14 DISTRICT NODES & 16 SHELTERS
# -----------------------------------------------------------------------------
NODES = {
    # ------------------ THIRUVANANTHAPURAM ------------------
    "tvm_city": {
        "id": "tvm_city", "name": "Thiruvananthapuram Central (East Fort)",
        "lat": 8.4875, "lng": 76.9486, "elevation": 14.0, "type": "intersection",
        "district": "Thiruvananthapuram", "region": "South", "isOriginPreset": True,
        "desc": "Capital urban center and transit junction, near Karamana river basin."
    },
    "attingal": {
        "id": "attingal", "name": "Attingal NH 66 Junction",
        "lat": 8.6965, "lng": 76.8143, "elevation": 18.0, "type": "intersection",
        "district": "Thiruvananthapuram", "region": "South", "isOriginPreset": True,
        "desc": "North Thiruvananthapuram arterial gateway along the Vamanapuram river."
    },
    "nedumangad": {
        "id": "nedumangad", "name": "Nedumangad Foothills Junction",
        "lat": 8.6045, "lng": 77.0016, "elevation": 45.0, "type": "intersection",
        "district": "Thiruvananthapuram", "region": "South",
        "desc": "Midland foothills connecting the southern Western Ghats."
    },
    "shelter_tvm": {
        "id": "shelter_tvm", "name": "Trivandrum Kudappanakunnu Civil Complex Safe Haven",
        "lat": 8.5482, "lng": 76.9582, "elevation": 65.0, "type": "shelter",
        "district": "Thiruvananthapuram", "region": "South", "capacity": 5000,
        "desc": "Elevated civil station hilltop plateau with emergency power and medical supplies."
    },

    # ------------------ KOLLAM ------------------
    "kollam_city": {
        "id": "kollam_city", "name": "Kollam Port & Chinnakada",
        "lat": 8.8932, "lng": 76.6141, "elevation": 5.5, "type": "intersection",
        "district": "Kollam", "region": "South", "isOriginPreset": True,
        "desc": "Ashtamudi lake and coastal harbor basin, vulnerable to backwater inundation."
    },
    "kottarakkara": {
        "id": "kottarakkara", "name": "Kottarakkara MC Road Hub",
        "lat": 8.9989, "lng": 76.7725, "elevation": 38.0, "type": "intersection",
        "district": "Kollam", "region": "South", "isOriginPreset": True,
        "desc": "Major midland road junction on the Main Central (MC) Road."
    },
    "karunagappally": {
        "id": "karunagappally", "name": "Karunagappally NH 66",
        "lat": 9.0551, "lng": 76.5367, "elevation": 7.0, "type": "intersection",
        "district": "Kollam", "region": "South",
        "desc": "Coastal coastal bypass near Kayamkulam Kayal."
    },
    "shelter_kollam": {
        "id": "shelter_kollam", "name": "Kollam Kottarakkara Jubilee High Ground Camp",
        "lat": 9.0012, "lng": 76.7760, "elevation": 42.0, "type": "shelter",
        "district": "Kollam", "region": "South", "capacity": 3500,
        "desc": "Highland educational and disaster relief camp outside the Ashtamudi surge zone."
    },

    # ------------------ PATHANAMTHITTA ------------------
    "adoor": {
        "id": "adoor", "name": "Adoor Central Bypass",
        "lat": 9.1530, "lng": 76.7356, "elevation": 32.0, "type": "intersection",
        "district": "Pathanamthitta", "region": "South", "isOriginPreset": True,
        "desc": "Southern gateway to Pathanamthitta district along MC Road."
    },
    "pathanamthitta_city": {
        "id": "pathanamthitta_city", "name": "Pathanamthitta Ring Road",
        "lat": 9.2648, "lng": 76.7870, "elevation": 42.0, "type": "intersection",
        "district": "Pathanamthitta", "region": "South", "isOriginPreset": True,
        "desc": "District headquarters on Achankovil river, gateway to Sabarimala hills."
    },
    "thiruvalla": {
        "id": "thiruvalla", "name": "Thiruvalla MC Road Junction",
        "lat": 9.3835, "lng": 76.5741, "elevation": 12.0, "type": "intersection",
        "district": "Pathanamthitta", "region": "South",
        "desc": "Lowland junction near the confluence of Manimala and Pamba rivers."
    },
    "shelter_pathanamthitta": {
        "id": "shelter_pathanamthitta", "name": "Catholicate College High Ridge Camp",
        "lat": 9.2710, "lng": 76.7820, "elevation": 95.0, "type": "shelter",
        "district": "Pathanamthitta", "region": "South", "capacity": 3200,
        "desc": "High altitude hillside campus refuge immune to Pamba river flash floods."
    },

    # ------------------ ALAPPUZHA ------------------
    "kayamkulam": {
        "id": "kayamkulam", "name": "Kayamkulam NH 66",
        "lat": 9.1724, "lng": 76.5011, "elevation": 6.0, "type": "intersection",
        "district": "Alappuzha", "region": "South",
        "desc": "Coastal commercial town bordered by backwaters."
    },
    "alappuzha_town": {
        "id": "alappuzha_town", "name": "Alappuzha Town & Canal Circle",
        "lat": 9.4981, "lng": 76.3388, "elevation": 2.2, "type": "intersection",
        "district": "Alappuzha", "region": "South", "isOriginPreset": True,
        "desc": "Vulnerable low-elevation coastal canal network and marine beach front."
    },
    "kuttanad": {
        "id": "kuttanad", "name": "Kuttanad Water Basin (Nedumudi)",
        "lat": 9.4357, "lng": 76.3986, "elevation": -1.5, "type": "intersection",
        "district": "Alappuzha", "region": "South", "isOriginPreset": True,
        "desc": "Sub-sea-level agricultural delta bowl, first to submerge in monsoon deluges."
    },
    "cherthala": {
        "id": "cherthala", "name": "Cherthala NH 66",
        "lat": 9.6845, "lng": 76.3328, "elevation": 5.2, "type": "intersection",
        "district": "Alappuzha", "region": "Central",
        "desc": "North Alappuzha highway connecting to Greater Kochi industrial corridor."
    },
    "shelter_alappuzha": {
        "id": "shelter_alappuzha", "name": "Alappuzha SD College Highland Camp",
        "lat": 9.4720, "lng": 76.3530, "elevation": 12.5, "type": "shelter",
        "district": "Alappuzha", "region": "South", "capacity": 3000,
        "desc": "Elevated campus ridge sanctuary above the Kuttanad delta water levels."
    },

    # ------------------ KOTTAYAM ------------------
    "changanassery": {
        "id": "changanassery", "name": "Changanassery Bypass",
        "lat": 9.4442, "lng": 76.5398, "elevation": 11.5, "type": "intersection",
        "district": "Kottayam", "region": "South",
        "desc": "Eastern edge of Kuttanad basin and gateway along MC Road."
    },
    "kottayam_city": {
        "id": "kottayam_city", "name": "Kottayam Baker Junction",
        "lat": 9.5916, "lng": 76.5222, "elevation": 15.0, "type": "intersection",
        "district": "Kottayam", "region": "South", "isOriginPreset": True,
        "desc": "Major midland commercial junction and Meenachil river crossing."
    },
    "pala": {
        "id": "pala", "name": "Pala River Highway",
        "lat": 9.7100, "lng": 76.6830, "elevation": 30.0, "type": "intersection",
        "district": "Kottayam", "region": "Central",
        "desc": "Foothill town on the banks of Meenachil river, connecting to high ranges."
    },
    "shelter_kottayam": {
        "id": "shelter_kottayam", "name": "CMS College Elevated Ridge Safe Hub",
        "lat": 9.5980, "lng": 76.5250, "elevation": 35.0, "type": "shelter",
        "district": "Kottayam", "region": "South", "capacity": 3500,
        "desc": "Historic hilltop campus above maximum Meenachil river flood level."
    },

    # ------------------ IDUKKI (HIGH RANGES) ------------------
    "kumily": {
        "id": "kumily", "name": "Kumily (Thekkady Gateway)",
        "lat": 9.6050, "lng": 77.1658, "elevation": 880.0, "type": "intersection",
        "district": "Idukki", "region": "Highland", "isOriginPreset": True,
        "desc": "Periyar Tiger Reserve mountain border town on NH 183."
    },
    "kattappana": {
        "id": "kattappana", "name": "Kattappana High Ranges",
        "lat": 9.7744, "lng": 77.1192, "elevation": 950.0, "type": "intersection",
        "district": "Idukki", "region": "Highland",
        "desc": "Central cardamon hills plateau in the high Western Ghats."
    },
    "idukki_painavu": {
        "id": "idukki_painavu", "name": "Painavu (Idukki District HQ)",
        "lat": 9.8504, "lng": 76.9744, "elevation": 750.0, "type": "intersection",
        "district": "Idukki", "region": "Highland", "isOriginPreset": True,
        "desc": "Administrative headquarters near the massive Idukki Arch Dam."
    },
    "adimali": {
        "id": "adimali", "name": "Adimali Gap Road Junction",
        "lat": 10.0125, "lng": 76.9532, "elevation": 520.0, "type": "intersection",
        "district": "Idukki", "region": "Highland",
        "desc": "Key transit junction on NH 85 prone to monsoon rockfalls."
    },
    "munnar": {
        "id": "munnar", "name": "Munnar Hill Station",
        "lat": 10.0889, "lng": 77.0595, "elevation": 1532.0, "type": "intersection",
        "district": "Idukki", "region": "Highland", "isOriginPreset": True,
        "desc": "Confluence of three mountain rivers, vulnerable to flash landslides."
    },
    "shelter_idukki": {
        "id": "shelter_idukki", "name": "Painavu Govt High Plateau Refuge",
        "lat": 9.8490, "lng": 76.9780, "elevation": 1020.0, "type": "shelter",
        "district": "Idukki", "region": "Highland", "capacity": 4000,
        "desc": "Bedrock reinforced high plateau complex safe from debris flows."
    },
    "shelter_munnar": {
        "id": "shelter_munnar", "name": "Munnar High-Range Sports Complex Refuge",
        "lat": 10.0920, "lng": 77.0650, "elevation": 1550.0, "type": "shelter",
        "district": "Idukki", "region": "Highland", "capacity": 2500,
        "desc": "Elevated bedrock sports arena above the valley flood line."
    },

    # ------------------ ERNAKULAM (GREATER KOCHI) ------------------
    "muvattupuzha": {
        "id": "muvattupuzha", "name": "Muvattupuzha 130 Junction",
        "lat": 9.9818, "lng": 76.5779, "elevation": 22.0, "type": "intersection",
        "district": "Ernakulam", "region": "Central", "isOriginPreset": True,
        "desc": "Confluence of three rivers connecting high ranges to Kochi plains."
    },
    "kothamangalam": {
        "id": "kothamangalam", "name": "Kothamangalam Gateway",
        "lat": 10.0617, "lng": 76.6268, "elevation": 36.0, "type": "intersection",
        "district": "Ernakulam", "region": "Central",
        "desc": "Gateway to High Ranges along NH 85."
    },
    "fort_kochi": {
        "id": "fort_kochi", "name": "Fort Kochi (Heritage Beach)",
        "lat": 9.9658, "lng": 76.2425, "elevation": 2.1, "type": "intersection",
        "district": "Ernakulam", "region": "Central", "isOriginPreset": True,
        "desc": "Coastal western locality, highly vulnerable to marine tidal surges."
    },
    "marine_drive": {
        "id": "marine_drive", "name": "Kochi Marine Drive Waterfront",
        "lat": 9.9790, "lng": 76.2750, "elevation": 3.2, "type": "intersection",
        "district": "Ernakulam", "region": "Central",
        "desc": "Vembanad lake waterfront corridor in Ernakulam CBD."
    },
    "vyttila": {
        "id": "vyttila", "name": "Vyttila Mobility Hub",
        "lat": 9.9696, "lng": 76.3204, "elevation": 4.8, "type": "intersection",
        "district": "Ernakulam", "region": "Central", "isOriginPreset": True,
        "desc": "Kerala's largest transit nexus connecting NH 66, Kochi Metro, and water buses."
    },
    "edappally": {
        "id": "edappally", "name": "Edappally Toll Metro Hub",
        "lat": 10.0248, "lng": 76.3079, "elevation": 6.5, "type": "intersection",
        "district": "Ernakulam", "region": "Central",
        "desc": "Crucial convergence of NH 66 and NH 544."
    },
    "kalamassery": {
        "id": "kalamassery", "name": "Kalamassery Premier Junction",
        "lat": 10.0538, "lng": 76.3214, "elevation": 8.0, "type": "intersection",
        "district": "Ernakulam", "region": "Central",
        "desc": "NH 544 industrial highway near CUSAT university."
    },
    "aluva_town": {
        "id": "aluva_town", "name": "Aluva Riverside Town",
        "lat": 10.1076, "lng": 76.3516, "elevation": 7.5, "type": "intersection",
        "district": "Ernakulam", "region": "Central", "isOriginPreset": True,
        "desc": "Periyar riverbank city, severe flood exposure during dam discharges."
    },
    "north_paravur": {
        "id": "north_paravur", "name": "North Paravur Town Circle",
        "lat": 10.1472, "lng": 76.2307, "elevation": 4.5, "type": "intersection",
        "district": "Ernakulam", "region": "Central", "isOriginPreset": True,
        "desc": "Coastal riverine delta intersection linking Vypin to NH 66."
    },
    "angamaly": {
        "id": "angamaly", "name": "Angamaly NH 544 Town Center",
        "lat": 10.1960, "lng": 76.3860, "elevation": 14.0, "type": "intersection",
        "district": "Ernakulam", "region": "Central", "isOriginPreset": True,
        "desc": "Northern Ernakulam terminal node for MC Road, near Cochin Airport."
    },
    "shelter_kakkanad": {
        "id": "shelter_kakkanad", "name": "Kakkanad Civil Station & Indoor Relief Camp",
        "lat": 10.0159, "lng": 76.3419, "elevation": 26.5, "type": "shelter",
        "district": "Ernakulam", "region": "Central", "capacity": 3500,
        "desc": "High plateau administrative complex with heavy helipad relief logistics."
    },
    "shelter_aluva": {
        "id": "shelter_aluva", "name": "Aluva UC College Elevated Campus Camp",
        "lat": 10.1250, "lng": 76.3420, "elevation": 19.5, "type": "shelter",
        "district": "Ernakulam", "region": "Central", "capacity": 2800,
        "desc": "Elevated campus ridge sanctuary above Periyar flood line."
    },

    # ------------------ THRISSUR ------------------
    "chalakudy": {
        "id": "chalakudy", "name": "Chalakudy NH 544",
        "lat": 10.3070, "lng": 76.3330, "elevation": 18.0, "type": "intersection",
        "district": "Thrissur", "region": "Central", "isOriginPreset": True,
        "desc": "Chalakudy river basin highway, subject to Sholayar dam flow inundation."
    },
    "kodungallur": {
        "id": "kodungallur", "name": "Kodungallur Coastal Heritage",
        "lat": 10.2244, "lng": 76.1960, "elevation": 5.0, "type": "intersection",
        "district": "Thrissur", "region": "Central",
        "desc": "Ancient port coastal delta vulnerable to Periyar estuary tidal surges."
    },
    "thrissur_city": {
        "id": "thrissur_city", "name": "Thrissur Swaraj Round",
        "lat": 10.5276, "lng": 76.2144, "elevation": 12.0, "type": "intersection",
        "district": "Thrissur", "region": "Central", "isOriginPreset": True,
        "desc": "Kerala's cultural capital circular intersection surrounding Vadakkunnathan temple."
    },
    "wadakkanchery": {
        "id": "wadakkanchery", "name": "Wadakkanchery Highway",
        "lat": 10.6625, "lng": 76.2420, "elevation": 25.0, "type": "intersection",
        "district": "Thrissur", "region": "Central",
        "desc": "Inland highway crossing towards Shoranur and northern districts."
    },
    "guruvayur": {
        "id": "guruvayur", "name": "Guruvayur Temple City",
        "lat": 10.5947, "lng": 76.0407, "elevation": 8.0, "type": "intersection",
        "district": "Thrissur", "region": "Central",
        "desc": "Major coastal pilgrimage hub."
    },
    "shelter_thrissur": {
        "id": "shelter_thrissur", "name": "Thrissur KAU Vellanikkara Campus Safe Hub",
        "lat": 10.5470, "lng": 76.2810, "elevation": 48.0, "type": "shelter",
        "district": "Thrissur", "region": "Central", "capacity": 5500,
        "desc": "Extensive Kerala Agricultural University elevated hilltop campus haven."
    },

    # ------------------ PALAKKAD ------------------
    "palakkad_city": {
        "id": "palakkad_city", "name": "Palakkad Fort & Victoria",
        "lat": 10.7867, "lng": 76.6548, "elevation": 84.0, "type": "intersection",
        "district": "Palakkad", "region": "North", "isOriginPreset": True,
        "desc": "Gateway through the Palakkad Gap in the Western Ghats."
    },
    "shoranur": {
        "id": "shoranur", "name": "Shoranur Railway River Hub",
        "lat": 10.7627, "lng": 76.2778, "elevation": 49.0, "type": "intersection",
        "district": "Palakkad", "region": "Central",
        "desc": "Bharathapuzha river crossing and major railway intersection."
    },
    "shelter_palakkad": {
        "id": "shelter_palakkad", "name": "Palakkad Govt Victoria College Safe Hub",
        "lat": 10.7810, "lng": 76.6490, "elevation": 85.0, "type": "shelter",
        "district": "Palakkad", "region": "North", "capacity": 4200,
        "desc": "High elevation inland educational campus with multi-building accommodation."
    },

    # ------------------ MALAPPURAM ------------------
    "tirur": {
        "id": "tirur", "name": "Tirur Coastal Railway Hub",
        "lat": 10.9147, "lng": 75.9229, "elevation": 11.0, "type": "intersection",
        "district": "Malappuram", "region": "North", "isOriginPreset": True,
        "desc": "Coastal Malabar transit town near Bharathapuzha estuary."
    },
    "malappuram_city": {
        "id": "malappuram_city", "name": "Malappuram Up Hill",
        "lat": 11.0738, "lng": 76.0740, "elevation": 68.0, "type": "intersection",
        "district": "Malappuram", "region": "North", "isOriginPreset": True,
        "desc": "District headquarters located atop hills in the midland terrain."
    },
    "shelter_malappuram": {
        "id": "shelter_malappuram", "name": "Govt College Malappuram High Ridge Camp",
        "lat": 11.0690, "lng": 76.0820, "elevation": 75.0, "type": "shelter",
        "district": "Malappuram", "region": "North", "capacity": 3800,
        "desc": "Elevated ridge complex overlooking the Kadalundi river valley."
    },

    # ------------------ KOZHIKODE ------------------
    "kozhikode_city": {
        "id": "kozhikode_city", "name": "Kozhikode Mananchira Square",
        "lat": 11.2588, "lng": 75.7804, "elevation": 8.0, "type": "intersection",
        "district": "Kozhikode", "region": "North", "isOriginPreset": True,
        "desc": "Major North Malabar urban metropolis and coastal trade center."
    },
    "thamarassery": {
        "id": "thamarassery", "name": "Thamarassery Churam Gateway",
        "lat": 11.4167, "lng": 75.9333, "elevation": 65.0, "type": "intersection",
        "district": "Kozhikode", "region": "North", "isOriginPreset": True,
        "desc": "Base of the 9-hairpin Thamarassery Churam Ghat road to Wayanad."
    },
    "vadakara": {
        "id": "vadakara", "name": "Vadakara NH 66 Coastal Hub",
        "lat": 11.6089, "lng": 75.5917, "elevation": 12.0, "type": "intersection",
        "district": "Kozhikode", "region": "North",
        "desc": "Northern coastal highway town connecting Kozhikode to Kannur."
    },
    "shelter_kozhikode": {
        "id": "shelter_kozhikode", "name": "Kozhikode Govt Medical College Campus Camp",
        "lat": 11.2720, "lng": 75.8360, "elevation": 52.0, "type": "shelter",
        "district": "Kozhikode", "region": "North", "capacity": 6000,
        "desc": "Massive elevated medical complex with extensive critical care and helipad infrastructure."
    },

    # ------------------ WAYANAD (LANDSLIDE PRONE) ------------------
    "kalpetta": {
        "id": "kalpetta", "name": "Kalpetta Wayanad HQ",
        "lat": 11.6050, "lng": 76.0828, "elevation": 780.0, "type": "intersection",
        "district": "Wayanad", "region": "Highland", "isOriginPreset": True,
        "desc": "District headquarters on the high Wayanad plateau along NH 766."
    },
    "mananthavady": {
        "id": "mananthavady", "name": "Mananthavady North Wayanad",
        "lat": 11.8026, "lng": 76.0034, "elevation": 760.0, "type": "intersection",
        "district": "Wayanad", "region": "Highland",
        "desc": "Northern Wayanad hub on the Kabini river basin."
    },
    "sultan_bathery": {
        "id": "sultan_bathery", "name": "Sultan Bathery East Wayanad",
        "lat": 11.6626, "lng": 76.2570, "elevation": 930.0, "type": "intersection",
        "district": "Wayanad", "region": "Highland",
        "desc": "Eastern high plateau gateway bordering Tamil Nadu and Karnataka."
    },
    "shelter_wayanad": {
        "id": "shelter_wayanad", "name": "Wayanad Kalpetta SKMJ High Plateau Safe Haven",
        "lat": 11.6090, "lng": 76.0880, "elevation": 780.0, "type": "shelter",
        "district": "Wayanad", "region": "Highland", "capacity": 4500,
        "desc": "Bedrock plateau educational arena safe from landslide and debris runs."
    },

    # ------------------ KANNUR ------------------
    "thalassery": {
        "id": "thalassery", "name": "Thalassery Heritage Port",
        "lat": 11.7480, "lng": 75.4894, "elevation": 10.0, "type": "intersection",
        "district": "Kannur", "region": "North",
        "desc": "Historic Malabar port and road nexus to Coorg ghats."
    },
    "kannur_city": {
        "id": "kannur_city", "name": "Kannur Caltex Circle",
        "lat": 11.8745, "lng": 75.3704, "elevation": 16.0, "type": "intersection",
        "district": "Kannur", "region": "North", "isOriginPreset": True,
        "desc": "District capital commercial hub on NH 66."
    },
    "payyanur": {
        "id": "payyanur", "name": "Payyanur Perumba Circle",
        "lat": 12.1009, "lng": 75.2017, "elevation": 15.0, "type": "intersection",
        "district": "Kannur", "region": "North",
        "desc": "Northern Kannur border town near Perumba river."
    },
    "shelter_kannur": {
        "id": "shelter_kannur", "name": "Kannur University Thavakkara Safe Complex",
        "lat": 11.8790, "lng": 75.3780, "elevation": 45.0, "type": "shelter",
        "district": "Kannur", "region": "North", "capacity": 3600,
        "desc": "Elevated campus ridge safe from coastal tidal ingress."
    },

    # ------------------ KASARAGOD ------------------
    "kanhangad": {
        "id": "kanhangad", "name": "Kanhangad Town",
        "lat": 12.3129, "lng": 75.0924, "elevation": 18.0, "type": "intersection",
        "district": "Kasaragod", "region": "North",
        "desc": "South Kasaragod commercial hub near Bekal Fort."
    },
    "kasaragod_city": {
        "id": "kasaragod_city", "name": "Kasaragod Old Bus Stand",
        "lat": 12.4996, "lng": 74.9869, "elevation": 14.0, "type": "intersection",
        "district": "Kasaragod", "region": "North", "isOriginPreset": True,
        "desc": "Northernmost district headquarters of Kerala on Chandragiri river."
    },
    "shelter_kasaragod": {
        "id": "shelter_kasaragod", "name": "Kasaragod Central University Tejaswini Hills",
        "lat": 12.3950, "lng": 75.0930, "elevation": 68.0, "type": "shelter",
        "district": "Kasaragod", "region": "North", "capacity": 4000,
        "desc": "Massive elevated university campus atop Tejaswini hills with disaster relief depot."
    },

    # ------------------ NEW ADDITIONAL SHELTERS (one per district) ------------------
    "shelter_attingal": {
        "id": "shelter_attingal", "name": "Attingal Vellayambalam Elevated Relief Camp",
        "lat": 8.7030, "lng": 76.8220, "elevation": 38.0, "type": "shelter",
        "district": "Thiruvananthapuram", "region": "South", "capacity": 2500,
        "desc": "Elevated inland camp above Vamanapuram river flood zone, north Thiruvananthapuram."
    },
    "shelter_karunagappally": {
        "id": "shelter_karunagappally", "name": "Karunagappally Inland High Ground Camp",
        "lat": 9.0610, "lng": 76.5620, "elevation": 32.0, "type": "shelter",
        "district": "Kollam", "region": "South", "capacity": 2200,
        "desc": "Elevated inland relief camp away from Kayamkulam Kayal coastal surge zone."
    },
    "shelter_adoor": {
        "id": "shelter_adoor", "name": "Adoor NSS College Ridge Camp",
        "lat": 9.1580, "lng": 76.7430, "elevation": 52.0, "type": "shelter",
        "district": "Pathanamthitta", "region": "South", "capacity": 2800,
        "desc": "Elevated NSS College campus above Kallada river reach, south Pathanamthitta."
    },
    "shelter_cherthala": {
        "id": "shelter_cherthala", "name": "Cherthala Elevated Community Relief Hub",
        "lat": 9.6890, "lng": 76.3500, "elevation": 18.0, "type": "shelter",
        "district": "Alappuzha", "region": "Central", "capacity": 2400,
        "desc": "Inland high ground camp above Vembanad lake backwater surge, north Alappuzha."
    },
    "shelter_pala": {
        "id": "shelter_pala", "name": "Pala Alphonsa College Highland Safe Hub",
        "lat": 9.7150, "lng": 76.6920, "elevation": 55.0, "type": "shelter",
        "district": "Kottayam", "region": "Central", "capacity": 2600,
        "desc": "Elevated hilltop college campus above Meenachil river flood level, eastern Kottayam."
    },
    "shelter_kattappana": {
        "id": "shelter_kattappana", "name": "Kattappana Cardamom Hills Emergency Base",
        "lat": 9.7790, "lng": 77.1250, "elevation": 980.0, "type": "shelter",
        "district": "Idukki", "region": "Highland", "capacity": 2000,
        "desc": "Bedrock plateau base in central cardamom hills, safe from debris flows."
    },
    "shelter_angamaly": {
        "id": "shelter_angamaly", "name": "Angamaly Airport Area Elevated Relief Campus",
        "lat": 10.2010, "lng": 76.3920, "elevation": 22.0, "type": "shelter",
        "district": "Ernakulam", "region": "Central", "capacity": 3000,
        "desc": "Elevated institutional campus near Cochin Airport, above Periyar river flood reach."
    },
    "shelter_wadakkanchery": {
        "id": "shelter_wadakkanchery", "name": "Wadakkanchery Inland High Ground Camp",
        "lat": 10.6670, "lng": 76.2500, "elevation": 42.0, "type": "shelter",
        "district": "Thrissur", "region": "Central", "capacity": 2800,
        "desc": "Inland elevated camp on midland ridge, away from Bharathapuzha flood basin."
    },
    "shelter_shoranur": {
        "id": "shelter_shoranur", "name": "Shoranur Riverside Ridge Relief Camp",
        "lat": 10.7680, "lng": 76.2840, "elevation": 65.0, "type": "shelter",
        "district": "Palakkad", "region": "Central", "capacity": 2500,
        "desc": "High ridge camp above Bharathapuzha river floodplain near Shoranur railway hub."
    },
    "shelter_tirur": {
        "id": "shelter_tirur", "name": "Tirur Govt High School Elevated Camp",
        "lat": 10.9190, "lng": 75.9300, "elevation": 28.0, "type": "shelter",
        "district": "Malappuram", "region": "North", "capacity": 2200,
        "desc": "Inland elevated campus above coastal Bharathapuzha estuary tidal zone."
    },
    "shelter_vadakara": {
        "id": "shelter_vadakara", "name": "Vadakara Inland Ridge Relief Station",
        "lat": 11.6140, "lng": 75.6100, "elevation": 35.0, "type": "shelter",
        "district": "Kozhikode", "region": "North", "capacity": 2400,
        "desc": "Inland elevated station above coastal NH 66 tidal surge belt in north Kozhikode."
    },
    "shelter_mananthavady": {
        "id": "shelter_mananthavady", "name": "Mananthavady Kabani River High Plateau Hub",
        "lat": 11.8060, "lng": 76.0120, "elevation": 800.0, "type": "shelter",
        "district": "Wayanad", "region": "Highland", "capacity": 3000,
        "desc": "Elevated plateau safe haven above Kabani river basin in north Wayanad."
    },
    "shelter_payyanur": {
        "id": "shelter_payyanur", "name": "Payyanur Ezhimala Hilltop Relief Camp",
        "lat": 12.1050, "lng": 75.2150, "elevation": 45.0, "type": "shelter",
        "district": "Kannur", "region": "North", "capacity": 2600,
        "desc": "Elevated hilltop camp near Ezhimala range above Perumba coastal surge area."
    },
    "shelter_kanhangad": {
        "id": "shelter_kanhangad", "name": "Kanhangad Bekal Inland Elevated Station",
        "lat": 12.3180, "lng": 75.1050, "elevation": 40.0, "type": "shelter",
        "district": "Kasaragod", "region": "North", "capacity": 2800,
        "desc": "Inland elevated relief station above Bekal coastal floodplain, south Kasaragod."
    }
}

# -----------------------------------------------------------------------------
# 2. DEFINE ARTERIAL CORRIDORS (EDGES)
# -----------------------------------------------------------------------------
EDGE_DEFINITIONS = [
    # NH 66 Coastal Highway Spine (South to North)
    {"id": "e_tvm_attingal", "u": "tvm_city", "v": "attingal", "name": "NH 66 Capital North Expressway", "capacity": 2400, "elevation": 16.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_attingal_kollam", "u": "attingal", "v": "kollam_city", "name": "NH 66 Kollam Bypass Approach", "capacity": 2200, "elevation": 12.0, "flood_susceptibility": 0.35, "hazard": "hazard_sea_erosion"},
    {"id": "e_kollam_karunagappally", "u": "kollam_city", "v": "karunagappally", "name": "NH 66 Ashtamudi Basin Link", "capacity": 2000, "elevation": 6.0, "flood_susceptibility": 0.65, "hazard": "hazard_kuttanad"},
    {"id": "e_karunagappally_kayamkulam", "u": "karunagappally", "v": "kayamkulam", "name": "NH 66 Kayamkulam Kayal Causeway", "capacity": 2100, "elevation": 6.5, "flood_susceptibility": 0.60, "hazard": "hazard_kuttanad"},
    {"id": "e_kayamkulam_alappuzha", "u": "kayamkulam", "v": "alappuzha_town", "name": "NH 66 Coastal Strip Highway", "capacity": 2200, "elevation": 4.0, "flood_susceptibility": 0.70, "hazard": "hazard_kuttanad"},
    {"id": "e_alappuzha_cherthala", "u": "alappuzha_town", "v": "cherthala", "name": "NH 66 Vembanad Shore Highway", "capacity": 2400, "elevation": 4.5, "flood_susceptibility": 0.65, "hazard": "hazard_kuttanad"},
    {"id": "e_cherthala_vyttila", "u": "cherthala", "v": "vyttila", "name": "NH 66 Aroor-Kumbalam Expressway", "capacity": 3000, "elevation": 5.0, "flood_susceptibility": 0.45, "hazard": "hazard_kuttanad"},
    {"id": "e_vyttila_edappally", "u": "vyttila", "v": "edappally", "name": "NH 66 Kochi Bypass Expressway", "capacity": 3400, "elevation": 6.0, "flood_susceptibility": 0.30, "hazard": None},
    {"id": "e_edappally_kalamassery", "u": "edappally", "v": "kalamassery", "name": "NH 544 Metro Corridor", "capacity": 3200, "elevation": 8.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_kalamassery_aluva", "u": "kalamassery", "v": "aluva_town", "name": "NH 544 Periyar Approach", "capacity": 3000, "elevation": 7.5, "flood_susceptibility": 0.75, "hazard": "hazard_periyar"},
    {"id": "e_aluva_angamaly", "u": "aluva_town", "v": "angamaly", "name": "NH 544 Airport Corridor", "capacity": 3200, "elevation": 12.0, "flood_susceptibility": 0.35, "hazard": "hazard_periyar"},
    {"id": "e_angamaly_chalakudy", "u": "angamaly", "v": "chalakudy", "name": "NH 544 Karukutty Border Link", "capacity": 3000, "elevation": 16.0, "flood_susceptibility": 0.40, "hazard": "hazard_periyar"},
    {"id": "e_chalakudy_thrissur", "u": "chalakudy", "v": "thrissur_city", "name": "NH 544 Thrissur South Expressway", "capacity": 3200, "elevation": 15.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_thrissur_wadakkanchery", "u": "thrissur_city", "v": "wadakkanchery", "name": "SH 22 Midland Highway", "capacity": 2000, "elevation": 20.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_wadakkanchery_shoranur", "u": "wadakkanchery", "v": "shoranur", "name": "Bharathapuzha Causeway Link", "capacity": 1800, "elevation": 35.0, "flood_susceptibility": 0.35, "hazard": None},
    {"id": "e_shoranur_tirur", "u": "shoranur", "v": "tirur", "name": "Kuttipuram-Tirur Highway", "capacity": 1900, "elevation": 22.0, "flood_susceptibility": 0.40, "hazard": None},
    {"id": "e_tirur_kozhikode", "u": "tirur", "v": "kozhikode_city", "name": "NH 66 Coastal Malabar Highway", "capacity": 2400, "elevation": 9.0, "flood_susceptibility": 0.45, "hazard": "hazard_sea_erosion"},
    {"id": "e_kozhikode_vadakara", "u": "kozhikode_city", "v": "vadakara", "name": "NH 66 Koyilandy Coastal Corridor", "capacity": 2200, "elevation": 11.0, "flood_susceptibility": 0.30, "hazard": None},
    {"id": "e_vadakara_thalassery", "u": "vadakara", "v": "thalassery", "name": "NH 66 Mahe Border Highway", "capacity": 2200, "elevation": 11.0, "flood_susceptibility": 0.30, "hazard": None},
    {"id": "e_thalassery_kannur", "u": "thalassery", "v": "kannur_city", "name": "NH 66 Edakkad Highway", "capacity": 2400, "elevation": 14.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_kannur_payyanur", "u": "kannur_city", "v": "payyanur", "name": "NH 66 Valapattanam Bridge Link", "capacity": 2100, "elevation": 15.0, "flood_susceptibility": 0.30, "hazard": None},
    {"id": "e_payyanur_kanhangad", "u": "payyanur", "v": "kanhangad", "name": "NH 66 Nileshwaram Causeway", "capacity": 2000, "elevation": 16.0, "flood_susceptibility": 0.30, "hazard": None},
    {"id": "e_kanhangad_kasaragod", "u": "kanhangad", "v": "kasaragod_city", "name": "NH 66 Chandragiri Coastal Highway", "capacity": 2200, "elevation": 15.0, "flood_susceptibility": 0.35, "hazard": None},

    # Main Central (MC Road - SH 1) Spine
    {"id": "e_tvm_nedumangad", "u": "tvm_city", "v": "nedumangad", "name": "Karakulam Foothills Highway", "capacity": 1900, "elevation": 30.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_tvm_kottarakkara", "u": "tvm_city", "v": "kottarakkara", "name": "MC Road Venjaramoodu-Chadayamangalam", "capacity": 2200, "elevation": 32.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_kollam_kottarakkara", "u": "kollam_city", "v": "kottarakkara", "name": "NH 744 Kollam-Shenkottai Arterial", "capacity": 2100, "elevation": 24.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_kottarakkara_adoor", "u": "kottarakkara", "v": "adoor", "name": "MC Road Enathu Bridge Link", "capacity": 2200, "elevation": 35.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_adoor_pathanamthitta", "u": "adoor", "v": "pathanamthitta_city", "name": "Adoor-Pathanamthitta Highway", "capacity": 1800, "elevation": 38.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_adoor_thiruvalla", "u": "adoor", "v": "thiruvalla", "name": "MC Road Pandalam-Chengannur Link", "capacity": 2200, "elevation": 18.0, "flood_susceptibility": 0.70, "hazard": "hazard_pamba"},
    {"id": "e_pathanamthitta_thiruvalla", "u": "pathanamthitta_city", "v": "thiruvalla", "name": "Kozhencherry Pamba Riverside Road", "capacity": 1700, "elevation": 22.0, "flood_susceptibility": 0.75, "hazard": "hazard_pamba"},
    {"id": "e_thiruvalla_changanassery", "u": "thiruvalla", "v": "changanassery", "name": "MC Road Perunna Arterial", "capacity": 2200, "elevation": 12.0, "flood_susceptibility": 0.50, "hazard": "hazard_kuttanad"},
    {"id": "e_changanassery_kottayam", "u": "changanassery", "v": "kottayam_city", "name": "MC Road Chingavanam Corridor", "capacity": 2400, "elevation": 14.0, "flood_susceptibility": 0.35, "hazard": None},
    {"id": "e_kottayam_pala", "u": "kottayam_city", "v": "pala", "name": "Ettumanoor-Pala Highway", "capacity": 2100, "elevation": 22.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_pala_muvattupuzha", "u": "pala", "v": "muvattupuzha", "name": "SH 8 Thodupuzha Foothills Highway", "capacity": 2000, "elevation": 26.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_kottayam_muvattupuzha", "u": "kottayam_city", "v": "muvattupuzha", "name": "MC Road Kuravilangad-Koothattukulam", "capacity": 2200, "elevation": 20.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_muvattupuzha_angamaly", "u": "muvattupuzha", "v": "angamaly", "name": "MC Road Perumbavoor Expressway", "capacity": 2400, "elevation": 18.0, "flood_susceptibility": 0.30, "hazard": "hazard_periyar"},
    {"id": "e_muvattupuzha_vyttila", "u": "muvattupuzha", "v": "vyttila", "name": "Kochi-Madurai Kochi City Approach", "capacity": 2500, "elevation": 14.0, "flood_susceptibility": 0.35, "hazard": None},

    # Kuttanad Canal Crossings
    {"id": "e_alappuzha_kuttanad", "u": "alappuzha_town", "v": "kuttanad", "name": "AC Canal Causeway West", "capacity": 1400, "elevation": -0.5, "flood_susceptibility": 0.95, "hazard": "hazard_kuttanad"},
    {"id": "e_kuttanad_changanassery", "u": "kuttanad", "v": "changanassery", "name": "AC Canal Causeway East", "capacity": 1400, "elevation": 0.5, "flood_susceptibility": 0.92, "hazard": "hazard_kuttanad"},

    # High Range & Western Ghats Corridors (Idukki & Munnar)
    {"id": "e_kottayam_kumily", "u": "kottayam_city", "v": "kumily", "name": "NH 183 Kottayam-Kumily (K-K Road)", "capacity": 1600, "elevation": 450.0, "flood_susceptibility": 0.30, "hazard": "hazard_idukki"},
    {"id": "e_kumily_kattappana", "u": "kumily", "v": "kattappana", "name": "Vandanmedu Mountain Pass", "capacity": 1300, "elevation": 910.0, "flood_susceptibility": 0.25, "hazard": "hazard_idukki"},
    {"id": "e_kattappana_idukki", "u": "kattappana", "v": "idukki_painavu", "name": "Idukki Arch Dam Ridgeline Road", "capacity": 1200, "elevation": 860.0, "flood_susceptibility": 0.30, "hazard": "hazard_idukki"},
    {"id": "e_muvattupuzha_kothamangalam", "u": "muvattupuzha", "v": "kothamangalam", "name": "NH 85 High Range Gateway", "capacity": 2200, "elevation": 28.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_kothamangalam_adimali", "u": "kothamangalam", "v": "adimali", "name": "NH 85 Neriamangalam Forest Gorge", "capacity": 1500, "elevation": 280.0, "flood_susceptibility": 0.40, "hazard": "hazard_idukki"},
    {"id": "e_adimali_munnar", "u": "adimali", "v": "munnar", "name": "NH 85 Cheeyappara Gap Road", "capacity": 1400, "elevation": 1100.0, "flood_susceptibility": 0.45, "hazard": "hazard_idukki"},
    {"id": "e_idukki_adimali", "u": "idukki_painavu", "v": "adimali", "name": "Painavu-Adimali Mountain Connector", "capacity": 1100, "elevation": 640.0, "flood_susceptibility": 0.35, "hazard": "hazard_idukki"},

    # Greater Kochi Sector
    {"id": "e_fortkochi_marine", "u": "fort_kochi", "v": "marine_drive", "name": "Goshree Marine Highway", "capacity": 2200, "elevation": 2.5, "flood_susceptibility": 0.60, "hazard": "hazard_sea_erosion"},
    {"id": "e_marine_vyttila", "u": "marine_drive", "v": "vyttila", "name": "SA Road Arterial Corridor", "capacity": 2800, "elevation": 4.0, "flood_susceptibility": 0.40, "hazard": None},
    {"id": "e_edappally_paravur", "u": "edappally", "v": "north_paravur", "name": "NH 66 Varappuzha Bridge Link", "capacity": 2500, "elevation": 5.5, "flood_susceptibility": 0.50, "hazard": "hazard_periyar"},
    {"id": "e_paravur_kodungallur", "u": "north_paravur", "v": "kodungallur", "name": "NH 66 Kottappuram Bridge", "capacity": 2200, "elevation": 5.0, "flood_susceptibility": 0.55, "hazard": "hazard_periyar"},
    {"id": "e_kodungallur_thrissur", "u": "kodungallur", "v": "thrissur_city", "name": "Irinjalakuda-Thrissur Highway", "capacity": 2000, "elevation": 10.0, "flood_susceptibility": 0.30, "hazard": None},
    {"id": "e_thrissur_guruvayur", "u": "thrissur_city", "v": "guruvayur", "name": "Thrissur-Guruvayur Highway", "capacity": 2200, "elevation": 10.0, "flood_susceptibility": 0.30, "hazard": None},

    # Central-North Links (Palakkad & Malappuram)
    {"id": "e_thrissur_palakkad", "u": "thrissur_city", "v": "palakkad_city", "name": "NH 544 Kuthiran Tunnel Expressway", "capacity": 3500, "elevation": 60.0, "flood_susceptibility": 0.15, "hazard": None},
    {"id": "e_palakkad_malappuram", "u": "palakkad_city", "v": "malappuram_city", "name": "NH 966 Palakkad-Kozhikode Arterial", "capacity": 2400, "elevation": 72.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_malappuram_kozhikode", "u": "malappuram_city", "v": "kozhikode_city", "name": "NH 966 Kondotty Airport Corridor", "capacity": 2600, "elevation": 35.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_shoranur_palakkad", "u": "shoranur", "v": "palakkad_city", "name": "Ottapalam-Palakkad Highway", "capacity": 2200, "elevation": 65.0, "flood_susceptibility": 0.20, "hazard": None},

    # Wayanad Ghat Road (NH 766 Thamarassery Churam 9 Hairpin Bends)
    {"id": "e_kozhikode_thamarassery", "u": "kozhikode_city", "v": "thamarassery", "name": "NH 766 Kunnamangalam Highway", "capacity": 2600, "elevation": 35.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_thamarassery_kalpetta", "u": "thamarassery", "v": "kalpetta", "name": "NH 766 Thamarassery Churam Ghat Road", "capacity": 1600, "elevation": 420.0, "flood_susceptibility": 0.70, "hazard": "hazard_wayanad"},
    {"id": "e_kalpetta_sultanbathery", "u": "kalpetta", "v": "sultan_bathery", "name": "NH 766 Meenangadi Plateau Highway", "capacity": 2000, "elevation": 850.0, "flood_susceptibility": 0.30, "hazard": "hazard_wayanad"},
    {"id": "e_kalpetta_mananthavady", "u": "kalpetta", "v": "mananthavady", "name": "SH 54 Wayanad Spine Road", "capacity": 1800, "elevation": 770.0, "flood_susceptibility": 0.35, "hazard": "hazard_wayanad"},
    {"id": "e_mananthavady_thalassery", "u": "mananthavady", "v": "thalassery", "name": "Nedumpoil-Boys Town Ghat Road", "capacity": 1400, "elevation": 380.0, "flood_susceptibility": 0.65, "hazard": "hazard_wayanad"},

    # District Town to Safe Shelter Connectors
    {"id": "e_tvm_shelter", "u": "tvm_city", "v": "shelter_tvm", "name": "Kudappanakunnu High Ridge Ascent", "capacity": 1800, "elevation": 40.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_kollam_shelter", "u": "kottarakkara", "v": "shelter_kollam", "name": "Kottarakkara Highland Shelter Link", "capacity": 1600, "elevation": 40.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_pathanamthitta_shelter", "u": "pathanamthitta_city", "v": "shelter_pathanamthitta", "name": "Catholicate College Hilltop Access", "capacity": 1500, "elevation": 70.0, "flood_susceptibility": 0.05, "hazard": None},
    {"id": "e_alappuzha_shelter", "u": "alappuzha_town", "v": "shelter_alappuzha", "name": "SD College Relief Corridor", "capacity": 1800, "elevation": 8.0, "flood_susceptibility": 0.30, "hazard": None},
    {"id": "e_kottayam_shelter", "u": "kottayam_city", "v": "shelter_kottayam", "name": "CMS College Hill Climb", "capacity": 1600, "elevation": 25.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_idukki_shelter", "u": "idukki_painavu", "v": "shelter_idukki", "name": "Painavu Plateau Security Ramp", "capacity": 1200, "elevation": 880.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_munnar_shelter", "u": "munnar", "v": "shelter_munnar", "name": "Munnar Sports High Ridge Link", "capacity": 1200, "elevation": 1540.0, "flood_susceptibility": 0.15, "hazard": None},
    {"id": "e_vyttila_shelterkakkanad", "u": "vyttila", "v": "shelter_kakkanad", "name": "Kakkanad Seaport-Airport Road", "capacity": 2800, "elevation": 18.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_aluva_shelteraluva", "u": "aluva_town", "v": "shelter_aluva", "name": "UC College Highland Approach", "capacity": 1800, "elevation": 14.0, "flood_susceptibility": 0.25, "hazard": None},
    {"id": "e_thrissur_shelter", "u": "thrissur_city", "v": "shelter_thrissur", "name": "KAU Vellanikkara Campus Arterial", "capacity": 2200, "elevation": 30.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_palakkad_shelter", "u": "palakkad_city", "v": "shelter_palakkad", "name": "Victoria College Campus Link", "capacity": 2000, "elevation": 85.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_malappuram_shelter", "u": "malappuram_city", "v": "shelter_malappuram", "name": "Govt College Ridge Ascent", "capacity": 1800, "elevation": 72.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_kozhikode_shelter", "u": "kozhikode_city", "v": "shelter_kozhikode", "name": "Medical College Relief Expressway", "capacity": 2600, "elevation": 30.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_wayanad_shelter", "u": "kalpetta", "v": "shelter_wayanad", "name": "SKMJ Plateau Shelter Ramp", "capacity": 1800, "elevation": 780.0, "flood_susceptibility": 0.15, "hazard": None},
    {"id": "e_kannur_shelter", "u": "kannur_city", "v": "shelter_kannur", "name": "Thavakkara University Gateway", "capacity": 2000, "elevation": 30.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_kasaragod_shelter", "u": "kasaragod_city", "v": "shelter_kasaragod", "name": "Tejaswini Hills University Highway", "capacity": 2200, "elevation": 45.0, "flood_susceptibility": 0.10, "hazard": None},

    # New Additional Shelter Connectors (one per district)
    {"id": "e_attingal_shelter2", "u": "attingal", "v": "shelter_attingal", "name": "Attingal Vellayambalam High Ascent", "capacity": 1600, "elevation": 28.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_karunagappally_shelter2", "u": "karunagappally", "v": "shelter_karunagappally", "name": "Karunagappally Inland Relief Link", "capacity": 1500, "elevation": 20.0, "flood_susceptibility": 0.12, "hazard": None},
    {"id": "e_adoor_shelter2", "u": "adoor", "v": "shelter_adoor", "name": "Adoor NSS College Ridge Road", "capacity": 1500, "elevation": 42.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_cherthala_shelter2", "u": "cherthala", "v": "shelter_cherthala", "name": "Cherthala Inland Relief Ascent", "capacity": 1600, "elevation": 12.0, "flood_susceptibility": 0.20, "hazard": None},
    {"id": "e_pala_shelter2", "u": "pala", "v": "shelter_pala", "name": "Pala Alphonsa College Hill Climb", "capacity": 1500, "elevation": 40.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_kattappana_shelter2", "u": "kattappana", "v": "shelter_kattappana", "name": "Kattappana Plateau Emergency Ramp", "capacity": 1200, "elevation": 960.0, "flood_susceptibility": 0.12, "hazard": None},
    {"id": "e_angamaly_shelter2", "u": "angamaly", "v": "shelter_angamaly", "name": "Angamaly Airport Campus Relief Link", "capacity": 1800, "elevation": 18.0, "flood_susceptibility": 0.15, "hazard": None},
    {"id": "e_wadakkanchery_shelter2", "u": "wadakkanchery", "v": "shelter_wadakkanchery", "name": "Wadakkanchery Ridge Shelter Road", "capacity": 1600, "elevation": 32.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_shoranur_shelter2", "u": "shoranur", "v": "shelter_shoranur", "name": "Shoranur Ridge Shelter Access", "capacity": 1500, "elevation": 55.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_tirur_shelter2", "u": "tirur", "v": "shelter_tirur", "name": "Tirur Govt Campus Approach", "capacity": 1500, "elevation": 18.0, "flood_susceptibility": 0.12, "hazard": None},
    {"id": "e_vadakara_shelter2", "u": "vadakara", "v": "shelter_vadakara", "name": "Vadakara Ridge Relief Station Link", "capacity": 1600, "elevation": 22.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_mananthavady_shelter2", "u": "mananthavady", "v": "shelter_mananthavady", "name": "Mananthavady Plateau Shelter Ramp", "capacity": 1600, "elevation": 780.0, "flood_susceptibility": 0.15, "hazard": None},
    {"id": "e_payyanur_shelter2", "u": "payyanur", "v": "shelter_payyanur", "name": "Payyanur Ezhimala Hilltop Access", "capacity": 1500, "elevation": 30.0, "flood_susceptibility": 0.10, "hazard": None},
    {"id": "e_kanhangad_shelter2", "u": "kanhangad", "v": "shelter_kanhangad", "name": "Kanhangad Bekal Inland Camp Link", "capacity": 1600, "elevation": 25.0, "flood_susceptibility": 0.10, "hazard": None}
]

# -----------------------------------------------------------------------------
# 3. DEFINE MAJOR DISASTER HAZARD ZONES ACROSS KERALA
# -----------------------------------------------------------------------------
HAZARD_ZONES = [
    {
        "id": "hazard_kuttanad",
        "name": "Kuttanad & Vembanad Delta Inundation Basin",
        "type": "flood",
        "severity": "extreme",
        "color": "#0284c7",
        "fillColor": "#38bdf8",
        "fillOpacity": 0.28,
        "desc": "Below-sea-level wetland delta spanning Alappuzha and Kottayam. Highly susceptible to severe river drainage congestion.",
        "coordinates": [
            [9.72, 76.32],
            [9.65, 76.45],
            [9.48, 76.55],
            [9.35, 76.54],
            [9.32, 76.42],
            [9.42, 76.31],
            [9.60, 76.28]
        ]
    },
    {
        "id": "hazard_wayanad",
        "name": "Wayanad Meppadi & Churam Landslide Hazard Zone",
        "type": "landslide",
        "severity": "severe",
        "color": "#b45309",
        "fillColor": "#f59e0b",
        "fillOpacity": 0.32,
        "desc": "High-slope Western Ghats escarpment prone to catastrophic debris flows and slope wash during extreme rainfall.",
        "coordinates": [
            [11.58, 76.02],
            [11.64, 76.08],
            [11.58, 76.18],
            [11.48, 76.16],
            [11.44, 76.06]
        ]
    },
    {
        "id": "hazard_idukki",
        "name": "Idukki & Munnar High-Range Landslide Corridor",
        "type": "landslide",
        "severity": "severe",
        "color": "#ea580c",
        "fillColor": "#fb923c",
        "fillOpacity": 0.28,
        "desc": "Munnar Gap Road and Neriamangalam river gorge. Vulnerable to road washouts and boulder blockades.",
        "coordinates": [
            [10.12, 77.02],
            [10.14, 77.12],
            [9.98, 77.10],
            [9.92, 76.95],
            [10.02, 76.92]
        ]
    },
    {
        "id": "hazard_periyar",
        "name": "Periyar River Floodplain & Dam Basin",
        "type": "flood",
        "severity": "moderate",
        "color": "#0369a1",
        "fillColor": "#0ea5e9",
        "fillOpacity": 0.25,
        "desc": "Low-lying riparian banks of Periyar across Aluva, Kalamassery, and Varappuzha.",
        "coordinates": [
            [10.16, 76.32],
            [10.14, 76.42],
            [10.07, 76.38],
            [10.03, 76.28],
            [10.12, 76.24]
        ]
    },
    {
        "id": "hazard_pamba",
        "name": "Pamba & Achankovil River Confluence Basin",
        "type": "flood",
        "severity": "moderate",
        "color": "#0284c7",
        "fillColor": "#38bdf8",
        "fillOpacity": 0.24,
        "desc": "Chengannur, Pandalam, and Thiruvalla floodplains submerged during reservoir spillway discharges.",
        "coordinates": [
            [9.39, 76.54],
            [9.36, 76.65],
            [9.22, 76.72],
            [9.18, 76.62],
            [9.28, 76.52]
        ]
    },
    {
        "id": "hazard_sea_erosion",
        "name": "Coastal Marine Surge & Erosion Belt",
        "type": "surge",
        "severity": "moderate",
        "color": "#e11d48",
        "fillColor": "#f43f5e",
        "fillOpacity": 0.22,
        "desc": "Vulnerable Arabian Sea littoral boundary facing severe monsoon swells and sea erosion.",
        "coordinates": [
            [9.98, 76.22],
            [9.98, 76.26],
            [9.75, 76.29],
            [9.75, 76.24]
        ]
    }
]

# -----------------------------------------------------------------------------
# 4. ROAD CLOSURE PRESETS
# -----------------------------------------------------------------------------
ROAD_CLOSURE_PRESETS = [
    {
        "edgeId": "e_thamarassery_kalpetta",
        "label": "Wayanad Thamarassery Churam (Debris Landslide)"
    },
    {
        "edgeId": "e_alappuzha_kuttanad",
        "label": "AC Canal Road (Fully Submerged Delta)"
    },
    {
        "edgeId": "e_adimali_munnar",
        "label": "Munnar Gap Road (Rockfall Blockage)"
    },
    {
        "edgeId": "e_kalamassery_aluva",
        "label": "Periyar River Aluva Bridge (Flood Overflow)"
    },
    {
        "edgeId": "e_adoor_thiruvalla",
        "label": "Chengannur MC Road (Pamba River Breach)"
    }
]

# -----------------------------------------------------------------------------
# 5. FETCH REAL OSRM DRIVING COORDINATES
# -----------------------------------------------------------------------------
def fetch_osrm_route(u_coord, v_coord):
    """
    Query OSRM for driving coordinates between [lat1, lng1] and [lat2, lng2].
    Retries once on failure (for slow ghat/mountain routes).
    Downsamples coordinates so Leaflet renders instantly with exact road fidelity.
    """
    lng1, lat1 = u_coord[1], u_coord[0]
    lng2, lat2 = v_coord[1], v_coord[0]
    url = f"http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson"

    for attempt in range(2):  # Try up to 2 times
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "KeralaSafeRoute/2.0"})
            resp = urllib.request.urlopen(req, timeout=15)
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
                route = data["routes"][0]
                raw_coords = route["geometry"]["coordinates"]
                distance_km = round(route["distance"] / 1000.0, 1)

                # Convert [lng, lat] -> [lat, lng] and downsample
                lat_lngs = [[round(pt[1], 5), round(pt[0], 5)] for pt in raw_coords]

                # Downsample to ~40-70 points max to keep file compact and blazing fast
                step = max(1, len(lat_lngs) // 50)
                sampled = lat_lngs[::step]
                if sampled[-1] != lat_lngs[-1]:
                    sampled.append(lat_lngs[-1])
                return sampled, distance_km
        except Exception:
            if attempt == 0:
                time.sleep(2)  # Wait 2s before retry

    # Graceful geometric fallback (interpolate 10 smooth points)
    n_pts = 10
    interp = []
    for i in range(n_pts + 1):
        frac = i / n_pts
        lat = round(lat1 + (lat2 - lat1) * frac, 5)
        lng = round(lng1 + (lng2 - lng1) * frac, 5)
        interp.append([lat, lng])
    # Approximate haversine distance
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    dist_km = round(6371 * c * 1.25, 1) # 1.25 winding road factor
    return interp, max(1.0, dist_km)

def main():
    print(f"============================================================")
    print(f"Building Full Kerala Evacuation Graph Network...")
    print(f"Total Nodes: {len(NODES)} (including 16 Safe Shelters)")
    print(f"Total Corridors to build: {len(EDGE_DEFINITIONS)}")
    print(f"============================================================")

    # Load existing cache if available
    cache_file = os.path.join(DATA_DIR, "kerala_full_roads.json")
    cached_paths = {}
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cached_paths = json.load(f)
            print(f"Loaded {len(cached_paths)} cached highway routes from {cache_file}")
        except Exception:
            pass

    edges = []
    for idx, edef in enumerate(EDGE_DEFINITIONS):
        u_node = NODES[edef["u"]]
        v_node = NODES[edef["v"]]
        u_coord = [u_node["lat"], u_node["lng"]]
        v_coord = [v_node["lat"], v_node["lng"]]

        # Check cache
        if edef["id"] in cached_paths:
            path = cached_paths[edef["id"]]["path"]
            dist_km = cached_paths[edef["id"]]["distance_km"]
            status = "CACHED"
        else:
            path, dist_km = fetch_osrm_route(u_coord, v_coord)
            cached_paths[edef["id"]] = {"path": path, "distance_km": dist_km}
            status = "FETCHED"
            time.sleep(0.15) # Gentle request pacing

        edge_obj = {
            "id": edef["id"],
            "name": edef["name"],
            "u": edef["u"],
            "v": edef["v"],
            "distance_km": dist_km,
            "capacity_veh_hr": edef["capacity"],
            "elevation": edef["elevation"],
            "flood_susceptibility": edef["flood_susceptibility"],
            "hazard_proximity": edef.get("hazard"),
            "isToggleable": True,
            "path": path
        }
        edges.append(edge_obj)
        print(f"[{idx+1}/{len(EDGE_DEFINITIONS)}] {edef['name']} ({dist_km} km, {len(path)} pts) -> {status}")

    # Save cache
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(cached_paths, f, indent=2)
    print(f"Saved road geometry cache to {cache_file}")

    # Metadata for Statewide Network
    metadata = {
        "region": "State of Kerala - Statewide Disaster Evacuation Network",
        "center": [10.35, 76.51],
        "defaultZoom": 8,
        "districtCount": 14,
        "nodeCount": len(NODES),
        "edgeCount": len(edges),
        "shelterCount": len([n for n in NODES.values() if n["type"] == "shelter"]),
        "simulatedDisclaimer": "Demonstration dataset for academic graph algorithm evacuation planning across Kerala."
    }

    # Save full graph as JSON
    full_graph = {
        "metadata": metadata,
        "nodes": NODES,
        "edges": edges,
        "hazardZones": HAZARD_ZONES,
        "roadClosurePresets": ROAD_CLOSURE_PRESETS
    }
    json_path = os.path.join(DATA_DIR, "full_kerala_graph.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_graph, f, indent=2)
    print(f"Saved complete graph JSON: {json_path}")

    # Write clean Python backend/graph_data.py loader
    py_content = '''"""
PlanEsc - Full Kerala Statewide Evacuation Network (Python Backend)
Loads the statewide graph from data/full_kerala_graph.json
"""
import json
import os

_DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "full_kerala_graph.json")

with open(_DATA_FILE, "r", encoding="utf-8") as _f:
    _DATA = json.load(_f)

METADATA = _DATA["metadata"]
NODES = _DATA["nodes"]
EDGES = _DATA["edges"]
HAZARD_ZONES = _DATA["hazardZones"]
ROAD_CLOSURE_PRESETS = _DATA["roadClosurePresets"]
'''
    py_path = os.path.join(BACKEND_DIR, "graph_data.py")
    with open(py_path, "w", encoding="utf-8") as f:
        f.write(py_content)
    print(f"Successfully generated backend graph data loader: {py_path}")

    # Write JS js/graph-data.js
    js_content = f'''/**
 * PlanEsc - Full Kerala Statewide Evacuation Network Data
 * Scale: Full State of Kerala (14 Districts)
 * Total Nodes: {len(NODES)} (including 16 Safe Shelters)
 * Total Edges: {len(edges)} Real-World Highways & Corridors
 */

const KERALA_GRAPH_DATA = {{
  metadata: {json.dumps(metadata, indent=2)},
  nodes: {json.dumps(NODES, indent=2)},
  hazardZones: {json.dumps(HAZARD_ZONES, indent=2)},
  edges: {json.dumps(edges, indent=2)}
}};

const ROAD_CLOSURE_PRESETS = {json.dumps(ROAD_CLOSURE_PRESETS, indent=2)};

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = {{ KERALA_GRAPH_DATA, ROAD_CLOSURE_PRESETS }};
}}
'''
    js_path = os.path.join(JS_DIR, "graph-data.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Successfully generated frontend graph data: {js_path}")

    print("\nStatewide Graph Generation Complete! All 14 districts mapped.")

if __name__ == "__main__":
    main()
