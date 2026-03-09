import sqlite3

def migrate():
    conn = sqlite3.connect('d:/09_Workspace/Traceability_VN/api/traceability_mvp.db')
    cursor = conn.cursor()
    
    # Check if we need to add columns
    try:
        cursor.execute("ALTER TABLE establishments ADD COLUMN address VARCHAR;")
        cursor.execute("ALTER TABLE establishments ADD COLUMN contact_phone VARCHAR;")
        cursor.execute("ALTER TABLE establishments ADD COLUMN contact_email VARCHAR;")
        cursor.execute("ALTER TABLE establishments ADD COLUMN business_registration_cert_url VARCHAR;")
        cursor.execute("ALTER TABLE establishments ADD COLUMN food_safety_cert_url VARCHAR;")
        print("Migration successful: Added new profile columns.")
    except sqlite3.OperationalError as e:
        print(f"Migration note: {e}")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
