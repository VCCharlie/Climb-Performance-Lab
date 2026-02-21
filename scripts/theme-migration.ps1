$srcDir = "src"

$files = Get-ChildItem -Path $srcDir -Recurse -Include *.js,*.jsx

$rules = @(
    @{ Regex = 'bg-slate-950'; Replacement = 'bg-cdbg' },
    @{ Regex = 'bg-slate-900'; Replacement = 'bg-cdbg' },
    @{ Regex = 'bg-slate-800/50'; Replacement = 'bg-cdsurface/80' },
    @{ Regex = 'bg-slate-800/80'; Replacement = 'bg-cdsurface/80' },
    @{ Regex = 'bg-slate-800'; Replacement = 'bg-cdsurface' },
    @{ Regex = 'bg-slate-700/50'; Replacement = 'bg-cdborder/50' },
    @{ Regex = 'bg-slate-700'; Replacement = 'bg-cdborder' },
    @{ Regex = 'bg-gray-800'; Replacement = 'bg-cdsurface' },
    @{ Regex = 'bg-gray-900'; Replacement = 'bg-cdbg' },
    
    @{ Regex = 'text-slate-100'; Replacement = 'text-cdtext' },
    @{ Regex = 'text-slate-200'; Replacement = 'text-cdtext' },
    @{ Regex = 'text-slate-300'; Replacement = 'text-cdtext' },
    @{ Regex = 'text-slate-400'; Replacement = 'text-cdmuted' },
    @{ Regex = 'text-slate-500'; Replacement = 'text-cdmuted' },
    @{ Regex = 'text-gray-200'; Replacement = 'text-cdtext' },
    @{ Regex = 'text-gray-300'; Replacement = 'text-cdtext' },
    @{ Regex = 'text-gray-400'; Replacement = 'text-cdmuted' },
    @{ Regex = 'text-white'; Replacement = 'text-cdtext' },
    
    @{ Regex = 'border-slate-700'; Replacement = 'border-cdborder' },
    @{ Regex = 'border-slate-800'; Replacement = 'border-cdborder' },
    @{ Regex = 'border-slate-600'; Replacement = 'border-cdborder' },
    @{ Regex = 'border-gray-700'; Replacement = 'border-cdborder' },
    @{ Regex = 'border-gray-800'; Replacement = 'border-cdborder' },
    @{ Regex = 'divide-slate-700'; Replacement = 'divide-cdborder' },
    @{ Regex = 'divide-slate-800'; Replacement = 'divide-cdborder' },

    @{ Regex = 'hover:bg-slate-700'; Replacement = 'hover:bg-slate-50' },
    @{ Regex = 'hover:bg-slate-800'; Replacement = 'hover:bg-slate-50' },
    @{ Regex = 'hover:text-white'; Replacement = 'hover:text-cdaccent' }
)

Write-Host "Starting Tailwind class migration..."

foreach ($file in $files) {
    if (-not $file.Exists) { continue }
    
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content

    foreach ($rule in $rules) {
        $content = [System.Text.RegularExpressions.Regex]::Replace($content, $rule.Regex, $rule.Replacement)
    }

    if ($content -cne $originalContent) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Migration completed."
