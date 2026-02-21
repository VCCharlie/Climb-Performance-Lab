import os
import re

directory = './src/components'

# Function to add imports if missing
def ensure_imports(content, new_imports):
    import_match = re.search(r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"];?", content)
    if import_match:
        existing_imports = [i.strip() for i in import_match.group(1).split(',')]
        imports_to_add = [i for i in new_imports if i not in existing_imports]
        if imports_to_add:
            new_import_string = import_match.group(0).replace(import_match.group(1), import_match.group(1) + ", " + ", ".join(imports_to_add))
            content = content.replace(import_match.group(0), new_import_string)
    return content


# WeatherClimb specific replacements
weather_climb_path = os.path.join(directory, 'WeatherClimb.jsx')
if os.path.exists(weather_climb_path):
    with open(weather_climb_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = ensure_imports(content, ['Info', 'Lightbulb', 'AlertTriangle'])

    # Fix the warnings array emojis
    content = content.replace("'ðŸ”¥ Hoge temperatuur", "'Hoge temperatuur")
    content = content.replace("'☀️  Warme omstandigheden", "'Warme omstandigheden")
    content = content.replace("'ðŸ¥¶ Lage temperatuur", "'Lage temperatuur")
    content = content.replace("'ðŸ’¨ Sterke tegenwind", "'Sterke tegenwind")
    content = content.replace("'ðŸ’§ Hoge luchtvochtigheid", "'Hoge luchtvochtigheid")

    # Fix the Info block
    old_info_block = '''            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️  Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-1">
                    <p><strong>• Temperatuur:</strong> Beïnvloedt luchtdichtheid (-0.4%/°C) én power output (warmte/koude stress)</p>
                    <p><strong>• Wind:</strong> Tegenwind verhoogt luchtweerstand, meewind verlaagt deze</p>
                    <p><strong>• Luchtvochtigheid:</strong> Hoge vochtigheid vermindert zweet verdamping (oververhitting risico)</p>
                    <p><strong>💡 Tip:</strong> Plan je beklimmingen in de ochtend bij warme dagen!</p>
                </div>
            </div>'''
            
    new_info_block = '''            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2"><Info size={16} /> Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-2">
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>Temperatuur:</strong> Beïnvloedt luchtdichtheid (-0.4%/°C) én power output (warmte/koude stress)</span></p>
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>Wind:</strong> Tegenwind verhoogt luchtweerstand, meewind verlaagt deze</span></p>
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>Luchtvochtigheid:</strong> Hoge vochtigheid vermindert zweet verdamping (oververhitting risico)</span></p>
                    <div className="mt-2 pt-2 border-t border-blue-100 flex items-start gap-2 text-blue-800"><Lightbulb size={14} className="mt-0.5 flex-shrink-0" /><p><strong>Tip:</strong> Plan je beklimmingen in de ochtend bij warme dagen!</p></div>
                </div>
            </div>'''
            
    content = content.replace(old_info_block, new_info_block)

    # Error message 
    content = content.replace('<div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-300 text-sm">\n                        ⚠️  {weatherError}\n                    </div>',
                              '<div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm flex items-center gap-2">\n                        <AlertTriangle size={16} /> {weatherError}\n                    </div>')

    # Haal op message
    content = content.replace('<div className="text-xs text-cdmuted">\n                        💡 Klik op "Haal op" om actuele weersgegevens voor {location} te laden\n                    </div>',
                              '<div className="text-xs text-cdmuted flex items-center gap-1">\n                        <Lightbulb size={12} className="text-yellow-500" /> Klik op "Haal op" om actuele weersgegevens voor {location} te laden\n                    </div>')
    
    # Time diff box
    content = content.replace("? 'bg-green-500/10 border-green-500/30 text-green-300'", "? 'bg-green-50 border-green-200 text-green-700'")
    content = content.replace("? 'bg-red-500/10 border-red-500/30 text-red-300'", "? 'bg-red-50 border-red-200 text-red-700'")
    content = content.replace(": 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'", ": 'bg-yellow-50 border-yellow-200 text-yellow-700'")
    
    # Warnings box loop
    content = content.replace('className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 flex items-start gap-2"', 'className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start gap-2"')
    content = content.replace('<AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />', '<AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />')
    content = content.replace('<p className="text-sm text-yellow-300">{warning}</p>', '<p className="text-sm text-yellow-800">{warning}</p>')

    with open(weather_climb_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed WeatherClimb.jsx")


# RacePacing specific replacements
race_pacing_path = os.path.join(directory, 'RacePacing.jsx')
if os.path.exists(race_pacing_path):
    with open(race_pacing_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = ensure_imports(content, ['Info', 'Lightbulb'])

    old_info_block = '''            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️  Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-1">
                    <p><strong>• Climb tijden:</strong> Berekend via physics engine (zwaartekracht, luchtweerstand, rolweerstand)</p>
                    <p><strong>• Energie verbruik:</strong> Mechanisch vermogen (kJ) → Metabolisch verbruik (lichaam is ~23% efficient)</p>
                    <p><strong>• Koolhydraten:</strong> Bij race intensiteit komt ~60% energie uit glycogeen. 1g carbs = 4 kcal</p>
                    <p><strong>• Glycogeen depot:</strong> Getrainde atleet heeft ~500g glycogeen (~2000 kcal) beschikbaar</p>
                    <p><strong>💡 Tip:</strong> Vermijd depletie &gt;80% - je hebt ook nog energie nodig voor vlakke stukken!</p>
                </div>
            </div>'''
            
    new_info_block = '''            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2"><Info size={16} /> Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-2">
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>Climb tijden:</strong> Berekend via physics engine (zwaartekracht, luchtweerstand, rolweerstand)</span></p>
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>Energie verbruik:</strong> Mechanisch vermogen (kJ) → Metabolisch verbruik (lichaam is ~23% efficient)</span></p>
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>Koolhydraten:</strong> Bij race intensiteit komt ~60% energie uit glycogeen. 1g carbs = 4 kcal</span></p>
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>Glycogeen depot:</strong> Getrainde atleet heeft ~500g glycogeen (~2000 kcal) beschikbaar</span></p>
                    <div className="mt-2 pt-2 border-t border-blue-100 flex items-start gap-2 text-blue-800"><Lightbulb size={14} className="mt-0.5 flex-shrink-0" /><p><strong>Tip:</strong> Vermijd depletie &gt;80% - je hebt ook nog energie nodig voor vlakke stukken!</p></div>
                </div>
            </div>'''
            
    content = content.replace(old_info_block, new_info_block)
    
    with open(race_pacing_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed RacePacing.jsx")


# RecoveryAdvisor specific replacements
recovery_advisor_path = os.path.join(directory, 'RecoveryAdvisor.jsx')
if os.path.exists(recovery_advisor_path):
    with open(recovery_advisor_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = ensure_imports(content, ['Info', 'Lightbulb'])

    old_info_block = '''            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️  Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-1">
                    <p><strong>• CTL (Fitness):</strong> 42-daags gemiddelde van training load. Hogere waarde = betere conditie</p>
                    <p><strong>• ATL (Fatigue):</strong> 7-daags gemiddelde. Hogere waarde = meer vermoeidheid</p>
                    <p><strong>• TSB (Form):</strong> CTL - ATL. Negatief = vermoeid, Positief = fris, 5-25 = race ready</p>
                    <p><strong>💡 Form:</strong> Je bent nu {metrics.form > 10 ? 'zeer fris' : metrics.form > 0 ? 'fris' : metrics.form > -10 ? 'licht vermoeid' : 'vermoeid'} ({Math.round(metrics.form)})</p>
                </div>
            </div>'''
            
    new_info_block = '''            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2"><Info size={16} /> Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-2">
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>CTL (Fitness):</strong> 42-daags gemiddelde van training load. Hogere waarde = betere conditie</span></p>
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>ATL (Fatigue):</strong> 7-daags gemiddelde. Hogere waarde = meer vermoeidheid</span></p>
                    <p className="flex items-start gap-2"><span className="mt-0.5">•</span><span><strong>TSB (Form):</strong> CTL - ATL. Negatief = vermoeid, Positief = fris, 5-25 = race ready</span></p>
                    <div className="mt-2 pt-2 border-t border-blue-100 flex items-start gap-2 text-blue-800"><Lightbulb size={14} className="mt-0.5 flex-shrink-0" /><p><strong>Form:</strong> Je bent nu {metrics.form > 10 ? 'zeer fris' : metrics.form > 0 ? 'fris' : metrics.form > -10 ? 'licht vermoeid' : 'vermoeid'} ({Math.round(metrics.form)})</p></div>
                </div>
            </div>'''
            
    content = content.replace(old_info_block, new_info_block)
    
    # 💡 Formulier in de tip onderaan? Niet nodig, alleen in de div.

    with open(recovery_advisor_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed RecoveryAdvisor.jsx")
