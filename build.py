"""
Build script to create a package suitable for uploading to the
Chrome Web Store
"""

import json
import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BASE_DIR, 'dist')
EXCLUDE = shutil.ignore_patterns('.*', '__*', '*.pyc', '*.py', 'dist')
NAME = 'scrobbler'

try:
    os.mkdir(OUTPUT)
except FileExistsError:
    pass


tempdir = os.path.join(OUTPUT, 'build')

try:
    shutil.rmtree(tempdir)
except FileNotFoundError:
    pass

# Copy files
print(f'Build directory: {tempdir}')
shutil.copytree('.', tempdir, ignore=EXCLUDE)

# Remove key from manifest
with open(os.path.join(tempdir, 'manifest.json'), 'r+') as f:
    manifest = json.load(f)
    try:
        del manifest['key']
    except IndexError:
        pass
    f.seek(0)
    json.dump(manifest, f, indent=4)
    f.truncate()

# Read version
version = manifest['version']

# Create zip
archive = os.path.join(OUTPUT, f'{NAME}_{version}.zip')

try:
    os.remove(archive)
except FileNotFoundError:
    pass

shutil.make_archive(archive[:-4], 'zip', tempdir)

print(f'Created {archive}')
