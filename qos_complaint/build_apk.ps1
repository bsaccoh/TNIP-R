$url = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
$zipPath = "jdk17.zip"
$extractPath = "jdk17"

if (-not (Test-Path $extractPath)) {
    Write-Host "Downloading JDK 17 from Eclipse Adoptium..."
    Invoke-WebRequest -Uri $url -OutFile $zipPath

    Write-Host "Extracting JDK 17..."
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

    # Clean up zip
    Remove-Item $zipPath -Force
}

$jdkDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
$javaDir = $jdkDir.FullName

Write-Host "Setting JAVA_HOME to $javaDir"
$env:JAVA_HOME = $javaDir
$env:Path = "$javaDir\bin;" + $env:Path

Write-Host "Checking Java Version..."
java -version

Write-Host "Building Flutter APK..."
flutter build apk --release
