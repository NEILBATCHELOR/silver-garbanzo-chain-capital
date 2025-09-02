#!/usr/bin/env python3
# =====================================================
# SIDEBAR CONFIGURATION CLEANUP SCRIPT
# Remove requiresProject (P flag) from all configurations
# Date: August 28, 2025
# =====================================================

import json
import psycopg2
from psycopg2.extras import RealDictCursor
import sys

# Database connection string (update with your credentials)
DB_CONNECTION = "postgresql://postgres.jrwfkxfzsnnjppogthaw:oqAY2u75AuGhVD3T@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"

def clean_configuration_data(config_data):
    """Remove requiresProject fields from configuration data recursively"""
    if isinstance(config_data, dict):
        # Create a new dictionary without requiresProject
        cleaned = {}
        for key, value in config_data.items():
            if key == 'requiresProject':
                continue  # Skip this field
            cleaned[key] = clean_configuration_data(value)
        return cleaned
    elif isinstance(config_data, list):
        # Clean each item in the list
        return [clean_configuration_data(item) for item in config_data]
    else:
        return config_data

def main():
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(DB_CONNECTION)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all configurations
        print("Fetching sidebar configurations...")
        cursor.execute("""
            SELECT id, name, configuration_data 
            FROM sidebar_configurations
        """)
        
        configurations = cursor.fetchall()
        print(f"Found {len(configurations)} configurations to process")
        
        updated_count = 0
        
        for config in configurations:
            config_id = config['id']
            config_name = config['name']
            config_data = config['configuration_data']
            
            # Clean the configuration data
            cleaned_data = clean_configuration_data(config_data)
            
            # Check if there were changes
            original_str = json.dumps(config_data, sort_keys=True)
            cleaned_str = json.dumps(cleaned_data, sort_keys=True)
            
            if original_str != cleaned_str:
                # Update the database
                cursor.execute("""
                    UPDATE sidebar_configurations 
                    SET configuration_data = %s, updated_at = now()
                    WHERE id = %s
                """, (json.dumps(cleaned_data), config_id))
                
                updated_count += 1
                print(f"✅ Updated configuration: {config_name} ({config_id})")
            else:
                print(f"⏩ No changes needed: {config_name} ({config_id})")
        
        # Commit changes
        conn.commit()
        print(f"\n🎉 Successfully updated {updated_count} configurations")
        
        # Verify cleanup
        print("\nVerifying cleanup...")
        cursor.execute("""
            SELECT count(*) as count
            FROM sidebar_configurations
            WHERE configuration_data::text LIKE '%requiresProject%'
        """)
        
        remaining_count = cursor.fetchone()['count']
        if remaining_count == 0:
            print("✅ Verification passed: No requiresProject fields remain")
        else:
            print(f"⚠️ Warning: {remaining_count} configurations still have requiresProject fields")
        
        # Show sample of cleaned data
        cursor.execute("""
            SELECT name, configuration_data->'sections'->0->'items'->0 as sample_item
            FROM sidebar_configurations
            LIMIT 1
        """)
        
        sample = cursor.fetchone()
        if sample and sample['sample_item']:
            print(f"\nSample cleaned item structure:")
            print(json.dumps(sample['sample_item'], indent=2))
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
