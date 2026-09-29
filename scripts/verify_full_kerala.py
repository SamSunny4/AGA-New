import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

ARTIFACT_DIR = r"C:\Users\samsu\.gemini\antigravity-ide\brain\c1360ea7-81a2-4767-8cd2-c11c384a3218"

def main():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1680,1000")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    try:
        print("Navigating to http://localhost:8008/index.html...")
        driver.get("http://localhost:8008/index.html")
        time.sleep(3.0)

        # 1. Capture Full Kerala Statewide Overview
        shot1 = os.path.join(ARTIFACT_DIR, "full_kerala_statewide_overview.png")
        driver.save_screenshot(shot1)
        print("Saved Full Kerala Overview:", shot1)

        # 2. Select Kalpetta (Wayanad) as Origin
        origin_select = Select(driver.find_element(By.ID, "origin-select"))
        origin_select.select_by_value("kalpetta")
        time.sleep(2.0)

        shot2 = os.path.join(ARTIFACT_DIR, "route_wayanad_kalpetta.png")
        driver.save_screenshot(shot2)
        print("Saved Wayanad Kalpetta Route:", shot2)

        # 3. Select Kasaragod as Origin
        origin_select.select_by_value("kasaragod_city")
        time.sleep(2.0)

        shot3 = os.path.join(ARTIFACT_DIR, "route_kasaragod.png")
        driver.save_screenshot(shot3)
        print("Saved Kasaragod Route:", shot3)

        # 4. Open Map Settings and test High Ranges Camera Preset + Satellite Hybrid
        settings_btn = driver.find_element(By.ID, "btn-map-settings")
        settings_btn.click()
        time.sleep(0.5)

        # Click High Ranges preset
        highlands_cam = driver.find_element(By.CSS_SELECTOR, "button[data-cam='highlands']")
        highlands_cam.click()
        time.sleep(1.5)

        # Click Satellite Hybrid
        hybrid_card = driver.find_element(By.CSS_SELECTOR, ".basemap-option-card[data-basemap='hybrid']")
        hybrid_card.click()
        time.sleep(1.5)

        # Toggle road capacities
        cap_chk = driver.find_element(By.ID, "setting-toggle-capacities")
        if not cap_chk.is_selected():
            cap_chk.click()
        time.sleep(1.0)

        shot4 = os.path.join(ARTIFACT_DIR, "high_ranges_satellite_capacities.png")
        driver.save_screenshot(shot4)
        print("Saved High Ranges Satellite with capacities:", shot4)

        # Reset camera to Statewide
        statewide_cam = driver.find_element(By.CSS_SELECTOR, "button[data-cam='kerala']")
        statewide_cam.click()
        time.sleep(1.5)

        close_settings = driver.find_element(By.ID, "btn-close-settings")
        close_settings.click()
        time.sleep(0.5)

        # 5. Launch Visual Algorithm Demonstration across full state
        launch_btn = driver.find_element(By.ID, "btn-start-presentation")
        launch_btn.click()
        time.sleep(1.0)

        shot5 = os.path.join(ARTIFACT_DIR, "kerala_morph_phase1.png")
        driver.save_screenshot(shot5)
        print("Saved Kerala Morph Phase 1:", shot5)

        # Jump to Phase 7 (Audience Math)
        dots = driver.find_elements(By.CSS_SELECTOR, "#hud-dots-track .hud-dot")
        if len(dots) >= 7:
            dots[6].click() # Phase 7
            time.sleep(1.5)
            shot6 = os.path.join(ARTIFACT_DIR, "kerala_morph_phase7_math.png")
            driver.save_screenshot(shot6)
            print("Saved Kerala Morph Phase 7:", shot6)

        # Close demo
        close_hud = driver.find_element(By.ID, "hud-btn-close")
        close_hud.click()
        time.sleep(1.0)

        print("All Full Kerala verifications completed successfully!")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
