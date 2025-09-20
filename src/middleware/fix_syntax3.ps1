$content = Get-Content firebaseMiddleware.ts
$newContent = @()

for ($i = 0; $i -lt $content.Length; $i++) {
    if ($i -eq 689 -and $content[$i] -match "^\s*}\s*$") {
        # Line 690 (0-based index 689) - this is the closing brace for the inner block
        # We need to add the closing brace for the try block here
        $newContent += $content[$i]  # Keep the original closing brace
        $newContent += "              } catch (inventoryError) {"
    } elseif ($i -eq 690 -and $content[$i] -match "}\s*catch\s*\(inventoryError\)") {
        # Skip the malformed catch line since we added it properly above
        continue
    } else {
        $newContent += $content[$i]
    }
}

$newContent | Set-Content firebaseMiddleware_fixed3.ts
Write-Host "Fixed syntax error by adding proper try-catch structure"
