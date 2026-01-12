@echo off
echo Initialization Git repository...
git init

echo Add all files...
git add .

echo Commit changes...
git commit -m "Update: %date% %time%"

echo Rename branch to main...
git branch -M main

echo Setting remote repository...
git remote remove origin
git remote add origin https://3b332042@github.com/3b332042/Monopoly.git

echo Pushing to GitHub...
git push -u origin main

echo Done!
pause
