#!/bin/sh -u

# exit if an error occurs
set -e

# installing prerequisites
echo 'installing prerequisites...'
apt-get update
apt-get upgrade -y
apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_4.x | bash -
apt-get install -y build-essential nodejs

# installing npm packages
cd /vagrant
# npm explore npm -g -- npm install node-gyp@latest
if [ -d "/vagrant/node_modules" ]; then
	rm -R /vagrant/node_modules
fi
npm install
npm install -g mocha

echo "*************************************************************************************"
echo "***                           Development VM created!                             ***"
echo "***                                                                               ***"
echo "***                                vagrant ssh                                    ***"
echo "***                                cd /vagrant                                    ***"
echo "***                              start: npm start                                 ***"
echo "***                              test: npm test                                   ***"
echo "*************************************************************************************"
