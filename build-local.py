#!/usr/bin/env python3
"""
Build local versions of HTML files with includes processed.
This simulates what Jekyll does on GitHub Pages.
"""

import os
import re
import shutil

def process_includes(html_content, base_path='_includes'):
    """Replace {% include filename %} with actual file contents."""
    
    # Pattern to match {% include filename.html %}
    pattern = r'{%\s*include\s+([^\s%}]+)\s*%}'
    
    def replace_include(match):
        filename = match.group(1)
        filepath = os.path.join(base_path, filename)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                print(f'  ✓ Included {filename}')
                return content
        except FileNotFoundError:
            print(f'  ⚠️  Include file not found: {filename}')
            return f'<!-- Include file not found: {filename} -->'
    
    return re.sub(pattern, replace_include, html_content)


def remove_front_matter(content):
    """Remove Jekyll front matter (--- ... ---)."""
    # Match front matter at the start of the file
    pattern = r'^---\s*\n.*?\n---\s*\n'
    return re.sub(pattern, '', content, flags=re.DOTALL)


def build_page(input_file, output_file):
    """Build a single page by processing includes."""
    
    print(f'\nProcessing {input_file}...')
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove Jekyll front matter
    content = remove_front_matter(content)
    
    # Process includes
    content = process_includes(content)
    
    # Write to output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'✓ Built {output_file}')


def copy_file(src, dest):
    """Copy a file to destination."""
    try:
        shutil.copy(src, dest)
        print(f'✓ Copied {src}')
    except FileNotFoundError:
        print(f'⚠️  File not found: {src}')


def main():
    """Build all pages."""
    
    print('🔨 Building site locally...\n')
    
    # Create _site directory for output
    os.makedirs('_site', exist_ok=True)
    
    # Build pages
    pages = [
        ('index.html', '_site/index.html'),
        ('pastevents.html', '_site/pastevents.html'),
    ]
    
    for input_file, output_file in pages:
        if os.path.exists(input_file):
            build_page(input_file, output_file)
        else:
            print(f'⚠️  Skipping {input_file} (not found)')
    
    print('\nCopying assets...')
    
    # Copy CSS file
    if os.path.exists('simple.css'):
        copy_file('simple.css', '_site/simple.css')
    
    # Copy _includes folder to _site for JavaScript fetch()
    if os.path.exists('_includes'):
        try:
            shutil.copytree('_includes', '_site/_includes', dirs_exist_ok=True)
            print('✓ Copied _includes/ folder')
        except:
            pass
    
    print('\n✅ Build complete!')
    print('📂 Output in _site/ folder')
    print('\n🌐 To test locally, run:')
    print('   python3 -m http.server 8000 --directory _site')
    print('   Then open: http://localhost:8000')


if __name__ == '__main__':
    main()
