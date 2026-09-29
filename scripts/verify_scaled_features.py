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
    chrome_options.add_argument("--window-size=1600,950")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    try:
        print("Navigating to http://localhost:8008/index.html...")
        driver.get("http://localhost:8008/index.html")
        time.sleep(2.5)

        # 1. Capture initial overview with scaled up network
        shot1 = os.path.join(ARTIFACT_DIR, "scaled_network_overview.png")
        driver.save_screenshot(shot1)
        print("Saved scaled network overview:", shot1)

        # 2. Select North Paravur as Origin
        origin_select = Select(driver.find_element(By.ID, "origin-select"))
        origin_select.select_by_value("north_paravur")
        time.sleep(1.5)

        shot2 = os.path.join(ARTIFACT_DIR, "route_north_paravur.png")
        driver.save_screenshot(shot2)
        print("Saved North Paravur route:", shot2)

        # 3. Open Map Settings
        settings_btn = driver.find_element(By.ID, "btn-map-settings")
        settings_btn.click()
        time.sleep(0.5)

        # Switch to Satellite Hybrid
        hybrid_card = driver.find_element(By.CSS_SELECTOR, ".basemap-option-card[data-basemap='hybrid']")
        hybrid_card.click()
        time.sleep(1.5)

        # Toggle show capacities
        cap_chk = driver.find_element(By.ID, "setting-toggle-capacities")
        if not cap_chk.is_selected():
            cap_chk.click()
        time.sleep(1.0)

        shot3 = os.path.join(ARTIFACT_DIR, "satellite_hybrid_capacities.png")
        driver.save_screenshot(shot3)
        print("Saved Satellite Hybrid with capacities:", shot3)

        # Close settings
        close_settings = driver.find_element(By.ID, "btn-close-settings")
        close_settings.click()
        time.sleep(0.5)

        # 4. Launch Visual Algorithm Demonstration
        launch_btn = driver.find_element(By.ID, "btn-start-presentation")
        launch_btn.click()
        time.sleep(1.0)

        shot4 = os.path.join(ARTIFACT_DIR, "morph_demo_phase1.png")
        driver.save_screenshot(shot4)
        print("Saved Morph Demo Phase 1:", shot4)

        # Advance to Phase 6 (Morph Routes to Straight Edges & Nodes)
        next_btn = driver.find_element(By.ID, "hud-btn-next")
        # Jump through phases using the dots
        dots = driver.find_elements(By.CSS_SELECTOR, "#hud-dots-track .hud-dot")
        if len(dots) >= 6:
            dots[5].click() # Phase 6
            time.sleep(1.5)
            shot5 = os.path.join(ARTIFACT_DIR, "morph_demo_phase6_straight_edges.png")
            driver.save_screenshot(shot5)
            print("Saved Morph Demo Phase 6:", shot5)

        if len(dots) >= 7:
            dots[6].click() # Phase 7 (Audience Calculation Explanations)
            time.sleep(1.5)
            shot6 = os.path.join(ARTIFACT_DIR, "morph_demo_phase7_audience_math.png")
            driver.save_screenshot(shot6)
            print("Saved Morph Demo Phase 7:", shot6)

        # Close demo
        close_hud = driver.find_element(By.ID, "hud-btn-close")
        close_hud.click()
        time.sleep(1.0)

        shot7 = os.path.join(ARTIFACT_DIR, "return_to_map_verified.png")
        driver.save_screenshot(shot7)
        print("Saved final return to map:", shot7)

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
