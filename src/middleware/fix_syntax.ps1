$content = Get-Content firebaseMiddleware.ts
$newContent = @()

for ($i = 0; $i -lt $content.Length; $i++) {
    if ($i -eq 688) {
        # Line 689 (0-based index 688) - add closing brace for try block
        $newContent += "                }"
        $newContent += "              } catch (inventoryError) {"
    } elseif ($i -eq 689) {
        # Skip the original catch line since we added it above
        continue
    } else {
        $newContent += $content[$i]
    }
}

$newContent | Set-Content firebaseMiddleware_fixed.ts
Write-Host "Fixed syntax error by adding missing closing brace for try block"
