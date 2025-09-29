#!/usr/bin/env python3
"""
Script to remove emojis from all source files in the project
"""
import os
import re
import glob

# Define comprehensive emoji pattern
emoji_pattern = re.compile(r'[🔄🤖📝💾❌✅📊🔍📖📦⚠️📤📋🔗💬🧹🗑️ℹ️🔒📡🔧🎯👤🚀🛠️🎉✨🏗️📁🔰⭐💡🌟💻🧪📈🔧🔍🗃️💬🔑🔒📊🎬🌐❓🎭🌍💼🎨🔮📈🎪🎨🎪🎯🎪🎨🎯🎪🎨🎯🎨🎯🎨🎯🎪🎨🎯📱🛡️]')

def remove_emojis_from_file(file_path):
    """Remove emojis from a single file"""
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        # Remove emojis
        original_content = content
        clean_content = emoji_pattern.sub('', content)
        
        # Only write if changes were made
        if original_content != clean_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(clean_content)
            print(f'✓ Cleaned emojis from: {file_path}')
            return True
        else:
            print(f'- No emojis found in: {file_path}')
            return False
    except Exception as e:
        print(f'✗ Error processing {file_path}: {e}')
        return False

def main():
    """Main function to process all files"""
    base_path = r'c:\Users\admin\Desktop\Prep\Thinkdeck-PrepStart'
    
    # Define file patterns to process
    file_patterns = [
        'backend-fastapi/**/*.py',
        'backend-server/**/*.js',
        'frontend-client/**/*.jsx',
        'frontend-client/**/*.js',
        'logging-backend/**/*.js',
        'logging-backend/**/*.py',
        '*.md',
        '*.txt'
    ]
    
    processed_files = 0
    cleaned_files = 0
    
    # Change to base directory
    original_dir = os.getcwd()
    os.chdir(base_path)
    
    try:
        for pattern in file_patterns:
            files = glob.glob(pattern, recursive=True)
            for file_path in files:
                # Skip certain directories
                if any(skip in file_path for skip in ['node_modules', '__pycache__', '.git', 'venv', '.next']):
                    continue
                
                if os.path.isfile(file_path):
                    processed_files += 1
                    if remove_emojis_from_file(file_path):
                        cleaned_files += 1
    
    finally:
        os.chdir(original_dir)
    
    print(f'\nSummary:')
    print(f'Processed {processed_files} files')
    print(f'Cleaned {cleaned_files} files')

if __name__ == '__main__':
    main()