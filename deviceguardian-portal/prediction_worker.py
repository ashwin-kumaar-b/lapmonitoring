import os
import time
import json
import pickle
import requests
import numpy as np
import pandas as pd
import shap

SUPABASE_URL = "https://lonsqhuudhiffjitmcbh.supabase.co/rest/v1/telemetry"
SUPABASE_HEADERS = {
    "apikey": "sb_publishable_huLEhuc-J4bal6hQRkPf5w_O16MKv6V",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def parse_battery_health(val):
    if not val:
        return 100.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            return float(val.replace("%", "").strip())
        except ValueError:
            return 100.0
    return 100.0

def run_worker():
    model_path = "laptop_model.pkl"
    features_path = "laptop_feature_columns.json"
    
    if not os.path.exists(model_path) or not os.path.exists(features_path):
        print("Model or feature mapping not found in this folder!")
        return
        
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
        
    with open(features_path, 'r') as f:
        feature_cols = json.load(f)
        
    # Initialize TreeExplainer once
    explainer = shap.TreeExplainer(model)
    print("DeviceGuardian AI - Prediction Worker started with SHAP Explainer.")
    
    while True:
        try:
            # 1. Fetch telemetry rows
            res = requests.get(SUPABASE_URL, headers=SUPABASE_HEADERS)
            if not res.ok:
                print(f"Error fetching telemetry: {res.status_code} {res.text}")
                time.sleep(5)
                continue
                
            devices = res.json()
            for dev in devices:
                uuid = dev.get("device_uuid")
                name = dev.get("device_name", "Unknown")
                payload = dev.get("payload", {})
                
                # Check if telemetry exists and parse fields
                cpu = payload.get("cpu", {})
                memory = payload.get("memory", {})
                battery = payload.get("battery", {})
                storage = payload.get("storage", {})
                disk_health = payload.get("disk_health", {})
                
                cpu_usage = cpu.get("usage_percent", 10.0)
                cpu_temp = cpu.get("temperature_c", 40.0)
                gpu_util = cpu.get("gpu_usage_percent", 0.0)
                gpu_temp = cpu.get("gpu_temperature_c", 35.0)
                memory_util = memory.get("ram_usage_percent", 50.0)
                bat_health = parse_battery_health(battery.get("health", 95.0))
                ssd_used = storage.get("disk_usage_percent", 50.0)
                ssd_errs = disk_health.get("errors", 0)
                
                # Align values with model columns
                input_data = {
                    'cpu_usage': [cpu_usage],
                    'cpu_temperature': [cpu_temp],
                    'gpu_utilization': [gpu_util],
                    'gpu_temperature': [gpu_temp],
                    'memory_utilization': [memory_util],
                    'battery_health': [bat_health],
                    'ssd_storage_used': [ssd_used],
                    'ssd_errors': [ssd_errs]
                }
                
                df_input = pd.DataFrame(input_data)[feature_cols]
                
                # Run prediction
                pred_health = float(model.predict(df_input)[0])
                
                # Run SHAP local explanation
                shap_values = explainer(df_input)
                shap_contribs = {}
                for col, val in zip(feature_cols, shap_values.values[0]):
                    # If SHAP value is negative, it represents health deduction
                    if val < -0.05:
                        shap_contribs[col] = round(float(val), 2)
                
                # Define risk
                if pred_health < 80.0:
                    risk = "High"
                elif pred_health < 90.0:
                    risk = "Medium"
                else:
                    risk = "Low"
                    
                # Remaining Useful Life (RUL) estimation model
                # Base RUL for a brand new laptop is 36 months (3 years)
                base_rul = 36.0
                
                # Apply multipliers based on health, thermal stress, and SSD error indicators
                health_factor = (pred_health / 100.0) ** 1.5
                
                # Accelerated aging multipliers
                thermal_multiplier = 1.0
                if cpu_temp > 80.0 or gpu_temp > 75.0:
                    thermal_multiplier = 0.7  # Silicon aging accelerates under heat
                if cpu_temp > 90.0:
                    thermal_multiplier = 0.4
                    
                ssd_multiplier = 1.0
                if ssd_errs > 0:
                    ssd_multiplier = max(0.1, 1.0 - (ssd_errs * 0.15))  # High disk error count decimates drive RUL
                    
                battery_multiplier = 1.0
                if bat_health < 80.0:
                    battery_multiplier = max(0.2, bat_health / 100.0)
                    
                rul_months = round(base_rul * health_factor * thermal_multiplier * ssd_multiplier * battery_multiplier, 1)

                # Define rule-based explanations matching input profiles
                explanations = []
                if cpu_temp > 85.0:
                    explanations.append("CPU thermal degradation (Arrhenius stress)")
                if gpu_temp > 80.0:
                    explanations.append("GPU thermal stress active")
                if bat_health < 60.0:
                    explanations.append("Battery capacity severely degraded")
                if ssd_errs > 0:
                    explanations.append(f"SSD disk errors detected: {ssd_errs} events")
                if ssd_used > 90.0 and memory_util > 85.0:
                    explanations.append("Memory page swap thrashing active")
                    
                if not explanations:
                    explanations.append("All metrics within nominal limits")
                    
                pred_block = {
                    "health": round(pred_health, 1),
                    "risk": risk,
                    "remaining_useful_life_months": rul_months,
                    "explanations": explanations,
                    "shap_contributions": shap_contribs,
                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
                
                # Check if prediction needs update
                existing_pred = payload.get("health_prediction", {})
                if existing_pred.get("health") != pred_block["health"] or "remaining_useful_life_months" not in existing_pred or "shap_contributions" not in existing_pred or len(existing_pred.get("explanations", [])) != len(explanations):
                    # Merge prediction into payload
                    payload["health_prediction"] = pred_block
                    
                    # PATCH back to Supabase
                    patch_url = f"{SUPABASE_URL}?device_uuid=eq.{uuid}"
                    patch_res = requests.patch(patch_url, headers=SUPABASE_HEADERS, json={"payload": payload})
                    if patch_res.ok:
                        print(f"Updated predictions for {name} ({uuid[:8]}): Health {pred_block['health']}% | Risk: {risk} | RUL: {rul_months} Months")
                    else:
                        print(f"Failed to update {name}: {patch_res.status_code} {patch_res.text}")
                        
        except Exception as e:
            print(f"Worker iteration failed: {e}")
            
        time.sleep(2)

if __name__ == "__main__":
    run_worker()
