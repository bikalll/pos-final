$content = Get-Content firebaseMiddleware.ts
$newContent = @()

for ($i = 0; $i -lt $content.Length; $i++) {
    if ($i -eq 689 -and $content[$i] -match "^\s*}\s*$") {
        # Line 690 (0-based index 689) - add closing brace for try block before the existing closing brace
        $newContent += "              } catch (inventoryError) {"
    } elseif ($i -eq 690 -and $content[$i] -match "^\s*}\s*catch\s*\(inventoryError\)") {
        # Skip the original malformed catch line
        continue
    } else {
        $newContent += $content[$i]
    }
}

$newContent | Set-Content firebaseMiddleware_fixed2.ts
Write-Host "Fixed syntax error by properly structuring try-catch block"
