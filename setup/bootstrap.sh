#!/bin/sh -u

# exit if an error occurs
set -e

# installing prerequisites
echo 'installing prerequisites...'
apt-get update
apt-get upgrade -y
curl -sL https://deb.nodesource.com/setup_0.10 | sudo bash -
apt-get install -y git build-essential nodejs

# installing npm packages
cd /vagrant
npm explore npm -g -- npm install node-gyp@latest
if [ -d "/vagrant/node_modules" ]; then
	rm -R /vagrant/node_modules
fi
npm install
npm install -g mocha

echo "**************************************************************************************"
echo "***                           Development VM created!                             ****"
echo "***                                                                               ****"
echo "***                         vagrant ssh && cd /vagrant                            ****"
echo "***                              start: npm start                                 ****"
echo "***                              test: npm test					                ****"
echo "**************************************************************************************"
