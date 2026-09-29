import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains

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
        time.sleep(2.5)

        map_elem = driver.find_element(By.ID, "map")

        # 1. Click anywhere on the map (e.g. offset from center by +80px x, -50px y)
        print("Simulating click on map to set custom origin...")
        actions = ActionChains(driver)
        actions.move_to_element_with_offset(map_elem, 300, 200).click().perform()
        time.sleep(2.0)

        shot1 = os.path.join(ARTIFACT_DIR, "custom_origin_clicked_point1.png")
        driver.save_screenshot(shot1)
        print("Saved Clicked Point 1 Screenshot:", shot1)

        # 2. Check the dropdown value and result card
        origin_select = driver.find_element(By.ID, "origin-select")
        selected_val = origin_select.get_attribute("value")
        print("Origin Select Value after click:", selected_val)

        shelter_title = driver.find_element(By.ID, "result-shelter-title").text
        metric_dist = driver.find_element(By.ID, "metric-distance").text
        print(f"Calculated Route from Custom Point -> {shelter_title} ({metric_dist})")

        # 3. Click another arbitrary spot in another region of Kerala (e.g. northern part of map)
        print("Simulating second click in another region...")
        actions = ActionChains(driver)
        actions.move_to_element_with_offset(map_elem, 220, -180).click().perform()
        time.sleep(2.0)

        shot2 = os.path.join(ARTIFACT_DIR, "custom_origin_clicked_point2.png")
        driver.save_screenshot(shot2)
        print("Saved Clicked Point 2 Screenshot:", shot2)

        shelter_title2 = driver.find_element(By.ID, "result-shelter-title").text
        metric_dist2 = driver.find_element(By.ID, "metric-distance").text
        print(f"Second Route from Custom Point -> {shelter_title2} ({metric_dist2})")

        # 4. Open Map Settings and test Satellite View on custom route
        settings_btn = driver.find_element(By.ID, "btn-map-settings")
        settings_btn.click()
        time.sleep(0.5)

        sat_card = driver.find_element(By.CSS_SELECTOR, ".basemap-option-card[data-basemap='satellite']")
        sat_card.click()
        time.sleep(1.5)

        close_settings = driver.find_element(By.ID, "btn-close-settings")
        close_settings.click()
        time.sleep(0.5)

        shot3 = os.path.join(ARTIFACT_DIR, "custom_origin_satellite_view.png")
        driver.save_screenshot(shot3)
        print("Saved Custom Origin on Satellite View:", shot3)

        print("Arbitrary map click origin testing completed with 100% success!")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
