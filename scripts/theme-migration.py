import os
import re

SRC_DIR = 'src'

# Migration rules mapping old classes to new ones based on Cycling-Dashboard theme
MIGRATION_RULES = [
    # Backgrounds
    (r'bg-slate-950', 'bg-cdbg'),
    (r'bg-slate-900', 'bg-cdbg'),
    (r'bg-slate-800/50', 'bg-cdsurface/80'),
    (r'bg-slate-800/80', 'bg-cdsurface/80'),
    (r'bg-slate-800', 'bg-cdsurface'),
    (r'bg-slate-700/50', 'bg-cdborder/50'),
    (r'bg-slate-700', 'bg-cdborder'),
    (r'bg-gray-800', 'bg-cdsurface'),
    (r'bg-gray-900', 'bg-cdbg'),
    
    # Text Colors
    (r'text-slate-100', 'text-cdtext'),
    (r'text-slate-200', 'text-cdtext'),
    (r'text-slate-300', 'text-cdtext'),
    (r'text-slate-400', 'text-cdmuted'),
    (r'text-slate-500', 'text-cdmuted'),
    (r'text-gray-200', 'text-cdtext'),
    (r'text-gray-300', 'text-cdtext'),
    (r'text-gray-400', 'text-cdmuted'),
    (r'text-white', 'text-cdtext'),
    
    # Borders
    (r'border-slate-700', 'border-cdborder'),
    (r'border-slate-800', 'border-cdborder'),
    (r'border-slate-600', 'border-cdborder'),
    (r'border-gray-700', 'border-cdborder'),
    (r'border-gray-800', 'border-cdborder'),
    (r'divide-slate-700', 'divide-cdborder'),
    (r'divide-slate-800', 'divide-cdborder'),

    # Hover states
    (r'hover:bg-slate-700', 'hover:bg-slate-50'),
    (r'hover:bg-slate-800', 'hover:bg-slate-50'),
    (r'hover:text-white', 'hover:text-cdaccent'),
]

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    for pattern, replacement in MIGRATION_RULES:
        content = re.sub(pattern, replacement, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def run_migration():
    print("Starting Tailwind class migration...")
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                migrate_file(os.path.join(root, file))
    print("Migration completed.")

if __name__ == '__main__':
    run_migration()
