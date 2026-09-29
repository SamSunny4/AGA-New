import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--window-size=1600,900')

driver = webdriver.Chrome(options=chrome_options)
driver.get('http://localhost:8008/index.html')
time.sleep(2)

# Open settings
driver.find_element('id', 'btn-map-settings').click()
time.sleep(1)

# 1. Switch to Topo
driver.find_element('css selector', 'button[data-basemap="topo"]').click()
time.sleep(2)
driver.save_screenshot(r'C:\Users\samsu\.gemini\antigravity-ide\brain\c1360ea7-81a2-4767-8cd2-c11c384a3218\topo_view.png')
print('Screenshot: Topo view saved')

# 2. Switch to Satellite Hybrid
driver.find_element('css selector', 'button[data-basemap="hybrid"]').click()
time.sleep(2)
driver.save_screenshot(r'C:\Users\samsu\.gemini\antigravity-ide\brain\c1360ea7-81a2-4767-8cd2-c11c384a3218\hybrid_view.png')
print('Screenshot: Hybrid view saved')

# 3. Toggle Dark EOC Mode
driver.find_element('id', 'setting-toggle-dark').click()
time.sleep(1)
driver.save_screenshot(r'C:\Users\samsu\.gemini\antigravity-ide\brain\c1360ea7-81a2-4767-8cd2-c11c384a3218\dark_eoc_view.png')
print('Screenshot: Dark EOC view saved')

driver.quit()
