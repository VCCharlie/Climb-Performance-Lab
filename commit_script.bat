@echo off
cd /d "C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab"
git add src/climbs_extended.js
git commit -m "fix: correct GPS coordinates and country codes for 100+ misplaced climbs

- Fixed nl_from (Fromberg) and lu_bourscheid: wrong hemisphere coords
- Fixed cu_stersouth, cu_stereast: Washington DC coords → Belgian Ardennes + country FR→BE
- Fixed cu_bourscheid, cu_bourscheid_northwest, cu_bourscheid_north: Alsace coords → Luxembourg + country DE→LU
- Fixed cu_burdeneast: Kansas coords → Luxembourg + country FR→LU
- Fixed cu_rosiersout/nort/northwest/east: Lyon FR coords → Belgian Ardennes + country FR→BE
- Previously fixed: 80+ Belgian, Austrian, NL climbs with Nominatim geocoding errors

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
