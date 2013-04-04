@echo off
REM assumes cygwin
touch %home%/.ssh/config_old
cp %HOME%/.ssh/config %HOME%/.ssh/config_old
echo Host * >> %HOME%/.ssh/config
echo 	ProxyCommand connect -a none -S localhost:9099 %%h %%p >> %HOME%/.ssh/config
git pull heroku master
rem git push heroku master
mv %HOME%/.ssh/config_old %HOME%/.ssh/config
