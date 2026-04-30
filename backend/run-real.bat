@echo off
cd /d "C:\Users\Mehtab Singh\Projects\SentinalScan\backend"
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"
mvn spring-boot:run -Dspring-boot.run.arguments=--scan.mode=real
