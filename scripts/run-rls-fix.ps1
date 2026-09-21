# Run RLS fix script
# Usage: .\scripts\run-rls-fix.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Supabase RLS Policy Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$password = Read-Host "Enter your Supabase database password" -AsSecureString
$pass = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

$env:PGPASSWORD = $pass
node scripts/apply-rls-fixes.mjs
$exitCode = $LASTEXITCODE

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
$pass = $null

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  RLS policies applied successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Failed to apply RLS policies." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run the SQL manually:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://supabase.com/dashboard/project/waxrmcnihuacxapvqpvj" -ForegroundColor Yellow
    Write-Host "  2. Click SQL Editor -> New Query" -ForegroundColor Yellow
    Write-Host "  3. Copy contents of supabase/fix_rls_policies.sql" -ForegroundColor Yellow
    Write-Host "  4. Click Run" -ForegroundColor Yellow
}
exit $exitCode