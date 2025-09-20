$content = Get-Content firebaseMiddleware.ts
$newContent = @()

for ($i = 0; $i -lt $content.Length; $i++) {
    if ($i -eq 689 -and $content[$i] -match "^\s*}\s*$") {
        # Line 690 (0-based index 689) - this is where we need to close the try block
        $newContent += $content[$i]  # Keep the original closing brace for the inner block
        $newContent += "              } catch (inventoryError) {"
        # Skip the next line which is the malformed catch
        $i++
    } else {
        $newContent += $content[$i]
    }
}

$newContent | Set-Content firebaseMiddleware_fixed4.ts
Write-Host "Fixed syntax error by properly closing try block"
