@echo off
cd /d "c:\Users\a9804\Desktop\VSCODE\Monopoly"
echo ---------------------------------------- >> startup_log.txt
echo Run at: %date% %time% >> startup_log.txt
echo Initialization Git repository... >> startup_log.txt
git init >> startup_log.txt 2>&1

echo Add all files... >> startup_log.txt
git add . >> startup_log.txt 2>&1

echo Commit changes... >> startup_log.txt
git commit -m "Startup Auto-Upload: %date% %time%" >> startup_log.txt 2>&1

echo Rename branch to main... >> startup_log.txt
git branch -M main >> startup_log.txt 2>&1

echo Setting remote repository... >> startup_log.txt
git remote remove origin >> startup_log.txt 2>&1
git remote add origin https://3b332042@github.com/3b332042/Monopoly.git >> startup_log.txt 2>&1

echo Pushing to GitHub... >> startup_log.txt
git push -u origin main >> startup_log.txt 2>&1

echo Done! >> startup_log.txt
echo ---------------------------------------- >> startup_log.txt
