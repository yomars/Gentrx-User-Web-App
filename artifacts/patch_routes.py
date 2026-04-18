#!/usr/bin/env python3
"""
Patch /opt/gentrx-api/routes/api.php to change auth:sanctum to auth:sanctum,api
on the large v1 route group (line 143) so that patient tokens (api guard) are
also accepted alongside Sanctum tokens (admin/staff).
"""
filepath = '/opt/gentrx-api/routes/api.php'

with open(filepath, 'r') as f:
    content = f.read()

old = "Route::group(['prefix' => 'v1', 'namespace' => 'api\\v1', 'middleware' => 'auth:sanctum'], function () {"
new = "Route::group(['prefix' => 'v1', 'namespace' => 'api\\v1', 'middleware' => 'auth:sanctum,api'], function () {"

if old in content:
    patched = content.replace(old, new, 1)
    with open(filepath, 'w') as f:
        f.write(patched)
    print('SUCCESS: changed auth:sanctum to auth:sanctum,api on the v1 route group')
else:
    print('ERROR: target string not found in api.php')
    print('Looking for partial matches:')
    for i, line in enumerate(content.split('\n'), 1):
        if 'auth:sanctum' in line and ('v1' in line or 'group' in line):
            print(f'  Line {i}: {repr(line)}')
